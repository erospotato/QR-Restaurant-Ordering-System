import React, { useState } from 'react'
import { api, money, inp } from '../lib'
import { useDialog } from '../context/DialogContext'

export default function TableManagement({ tables = [], reload = () => {}, isManager = false }) {
  const { confirm: confirmDialog } = useDialog()
  const [showAdd, setShowAdd] = useState(false)
  const [formAdd, setFormAdd] = useState({ number: '', capacity: 4 })

  const [showMove, setShowMove] = useState(false)
  const [moveFrom, setMoveFrom] = useState('')
  const [moveTo, setMoveTo] = useState('')

  const [showMerge, setShowMerge] = useState(false)
  const [mergeSrc, setMergeSrc] = useState('')
  const [mergeTgt, setMergeTgt] = useState('')

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      await api('/staff/tables', { method: 'POST', body: formAdd })
      setShowAdd(false)
      setFormAdd({ number: '', capacity: 4 })
      reload()
    } catch (e) {
      alert(e.message || 'Failed to add table')
    }
  }

  const handleDelete = async (num) => {
    const ok = await confirmDialog({
      title: 'Remove Floor Table',
      message: `Are you sure you want to remove Table #${num}? Active orders on this table should be cleared first.`,
      confirmText: 'Yes, Remove Table',
      cancelText: 'Cancel',
      type: 'danger',
    })
    if (!ok) return
    try {
      await api(`/staff/tables/${num}`, { method: 'DELETE' })
      reload()
    } catch (e) {
      alert(e.message || 'Cannot delete table')
    }
  }

  const handleMove = async (e) => {
    e.preventDefault()
    try {
      await api('/staff/tables/move', {
        method: 'POST',
        body: { from_number: Number(moveFrom), to_number: Number(moveTo) },
      })
      setShowMove(false)
      reload()
    } catch (e) {
      alert(e.message || 'Failed to move table')
    }
  }

  const handleMerge = async (e) => {
    e.preventDefault()
    try {
      await api('/staff/tables/merge', {
        method: 'POST',
        body: { source_number: Number(mergeSrc), target_number: Number(mergeTgt) },
      })
      setShowMerge(false)
      reload()
    } catch (e) {
      alert(e.message || 'Failed to merge tables')
    }
  }

  const handleUnmerge = async (num) => {
    await api('/staff/tables/unmerge', { method: 'POST', body: { number: num } })
    reload()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warm-200 bg-white p-4 sm:p-5 shadow-card">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-warm-900">
            Dining Floor &amp; Table Management
          </h2>
          <p className="text-xs text-warm-500 font-mono mt-0.5">
            Rearrange guest tables · Move orders between tables · Merge parties
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isManager && (
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-xl bg-brand px-3.5 py-1.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white active:scale-95 transition"
            >
              + Add Table
            </button>
          )}
          <button
            onClick={() => setShowMove(true)}
            className="rounded-xl border border-warm-300 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-warm-800 hover:bg-warm-100 hover:text-warm-950 hover:border-warm-400 active:bg-warm-200 active:text-warm-950 transition"
          >
            Move Orders
          </button>
          <button
            onClick={() => setShowMerge(true)}
            className="rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-purple-900 hover:bg-purple-100 hover:text-purple-950 hover:border-purple-300 active:bg-purple-200 active:text-purple-950 transition"
          >
            Merge Tables
          </button>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="rounded-2xl border border-warm-200 bg-white p-8 text-center shadow-card">
          <p className="font-mono text-sm text-warm-500">No tables configured yet.</p>
          {isManager && (
            <button
              onClick={() => setShowAdd(true)}
              className="mt-3 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-dark transition"
            >
              + Create First Table
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {tables.map((t) => (
            <div
              key={t.number}
              className="flex flex-col justify-between rounded-2xl border border-warm-200 bg-white p-4 shadow-card"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-bold text-warm-900">
                    Table #{t.number}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                      t.status === 'occupied' ? 'bg-amber-100 text-amber-800' : 'bg-warm-100 text-warm-700'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <p className="text-xs font-mono text-warm-500 mt-0.5">{t.capacity} seats</p>

                {t.merged_with && (
                  <div className="mt-2 rounded-lg bg-purple-50 p-1.5 text-xs font-medium text-purple-900 border border-purple-200">
                    Merged into {t.merged_with}
                    <button
                      onClick={() => handleUnmerge(t.number)}
                      className="ml-2 underline text-rose-600 text-[11px]"
                    >
                      Unmerge
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-warm-100 flex items-center justify-between">
                <span className="font-mono text-xs sm:text-sm font-medium text-warm-800">
                  {t.unpaid_total > 0 ? money(t.unpaid_total) : 'Clean'}
                </span>
                {isManager && (
                  <button
                    onClick={() => handleDelete(t.number)}
                    className="text-xs font-medium text-rose-600 hover:text-rose-800"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleAdd} className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-3.5">
            <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">Create Table</h3>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">Table Number</label>
              <input
                type="number"
                required
                className={inp + ' w-full font-mono text-sm'}
                value={formAdd.number}
                onChange={(e) => setFormAdd({ ...formAdd, number: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">Seats / Capacity</label>
              <input
                type="number"
                required
                className={inp + ' w-full font-mono text-sm'}
                value={formAdd.capacity}
                onChange={(e) => setFormAdd({ ...formAdd, capacity: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-xl bg-warm-100 py-2.5 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-brand py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white transition"
              >
                Add Table
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Move Modal */}
      {showMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleMove} className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-3.5">
            <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">Move Table Orders</h3>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">From Table #</label>
              <select
                required
                className={inp + ' w-full font-mono text-sm'}
                value={moveFrom}
                onChange={(e) => setMoveFrom(e.target.value)}
              >
                <option value="">Select table</option>
                {tables.map((t) => (
                  <option key={t.number} value={t.number}>Table #{t.number}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">To Destination Table #</label>
              <select
                required
                className={inp + ' w-full font-mono text-sm'}
                value={moveTo}
                onChange={(e) => setMoveTo(e.target.value)}
              >
                <option value="">Select destination</option>
                {tables.map((t) => (
                  <option key={t.number} value={t.number}>Table #{t.number}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => setShowMove(false)}
                className="flex-1 rounded-xl bg-warm-100 py-2.5 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-brand py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white transition"
              >
                Transfer Orders
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Merge Modal */}
      {showMerge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleMerge} className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-3.5">
            <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">Merge Two Tables</h3>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">Source Table to Merge</label>
              <select
                required
                className={inp + ' w-full font-mono text-sm'}
                value={mergeSrc}
                onChange={(e) => setMergeSrc(e.target.value)}
              >
                <option value="">Select table</option>
                {tables.map((t) => (
                  <option key={t.number} value={t.number}>Table #{t.number}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">Target Master Table</label>
              <select
                required
                className={inp + ' w-full font-mono text-sm'}
                value={mergeTgt}
                onChange={(e) => setMergeTgt(e.target.value)}
              >
                <option value="">Select target</option>
                {tables.map((t) => (
                  <option key={t.number} value={t.number}>Table #{t.number}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => setShowMerge(false)}
                className="flex-1 rounded-xl bg-warm-100 py-2.5 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-purple-700 py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-purple-800 hover:text-white active:bg-purple-900 active:text-white transition"
              >
                Merge Tables
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
