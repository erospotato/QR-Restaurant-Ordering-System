import React, { useState } from 'react'
import { api, ago } from '../lib'
import { useDialog } from '../context/DialogContext'

export default function KitchenDisplay({ orders = [], reload = () => {} }) {
  const { confirm: confirmDialog, toast } = useDialog()
  const [struckItems, setStruckItems] = useState({})
  const [filterCat, setFilterCat] = useState('all')
  const [removingItemId, setRemovingItemId] = useState(null)

  const toggleItemStrike = (key) => {
    setStruckItems((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const advance = async (orderId, status) => {
    await api(`/orders/${orderId}`, { method: 'PATCH', body: { status } })
    reload()
  }

  const handleRemoveItem = async (e, tableNumber, item) => {
    e.stopPropagation()
    if (!tableNumber || !item?.id || removingItemId) return

    const ok = await confirmDialog({
      title: 'Remove Unavailable Item',
      message: `Remove "${item.qty}× ${item.name}" from Table #${tableNumber}? It will also be removed from the table's bill.`,
      confirmText: 'Yes, Remove Item',
      cancelText: 'Keep Item',
      type: 'danger',
    })
    if (!ok) return

    setRemovingItemId(item.id)
    try {
      await api(`/staff/tables/${tableNumber}/remove-item`, {
        method: 'POST',
        body: { item_id: item.id },
      })
      toast(`Removed "${item.name}" from Table #${tableNumber}`, 'success')
      reload()
    } catch (err) {
      toast(err.message || 'Failed to remove item', 'error')
    } finally {
      setRemovingItemId(null)
    }
  }

  const stages = [
    { id: 'new', title: 'New Orders', next: 'preparing', btn: 'Start Prep', color: 'bg-rose-500' },
    { id: 'preparing', title: 'In Preparation', next: 'ready', btn: 'Mark Ready', color: 'bg-amber-500' },
    { id: 'ready', title: 'Ready to Serve', next: 'served', btn: 'Complete Delivery', color: 'bg-emerald-500' },
  ]

  return (
    <div className="space-y-4">
      {/* KDS Station Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warm-200 bg-white p-4 sm:p-5 shadow-card">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-warm-900">
            Kitchen Display System (KDS)
          </h2>
          <p className="text-xs text-warm-500 font-mono mt-0.5">
            Interactive ticket line · Click dish items to mark plated
          </p>
        </div>

        {/* Category Filters for kitchen stations */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-warm-100 p-1 text-xs">
            {['all', 'mains', 'drinks'].map((c) => (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                className={`rounded-lg px-2.5 py-1 uppercase text-xs font-medium tracking-wide transition ${
                  filterCat === c
                    ? 'bg-brand text-white hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white shadow-xs font-semibold'
                    : 'text-warm-600 hover:text-warm-950 hover:bg-warm-200/70 active:bg-warm-300 active:text-warm-950'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={reload}
            className="rounded-xl bg-brand px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* 3 Columns Kanban */}
      <div className="grid gap-3.5 md:grid-cols-3">
        {stages.map((stg) => {
          const list = (orders || []).filter((o) => o.status === stg.id)
          return (
            <div key={stg.id} className="flex flex-col rounded-3xl bg-warm-200/50 p-3 min-h-[220px]">
              <div className="mb-3 flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${stg.color}`} />
                  <span className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-warm-900">
                    {stg.title}
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-warm-800 rounded-full bg-white px-2.5 py-0.5 shadow-xs">
                  {list.length}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto max-h-[75vh]">
                {list.length === 0 ? (
                  <div className="flex h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-warm-300 text-center p-4">
                    <p className="font-mono text-xs text-warm-400 font-medium">No tickets in this stage</p>
                  </div>
                ) : (
                  list.map((ticket) => {
                  const minutesAgo = Math.floor((Date.now() - ticket.ts) / 60000)
                  const isUrgent = minutesAgo > 15
                  return (
                    <div
                      key={ticket.id}
                      className={`flex flex-col justify-between gap-3 rounded-2xl bg-white p-4 sm:p-5 shadow-card border transition ${
                        isUrgent ? 'border-rose-400 ring-2 ring-rose-200' : 'border-warm-200'
                      }`}
                    >
                      {/* Ticket Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-warm-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-base font-bold leading-snug text-warm-900">
                            Table #{ticket.table}
                          </span>
                          {ticket.addon && (
                            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold leading-normal text-purple-700 border border-purple-200">
                              Round 2+
                            </span>
                          )}
                        </div>
                        <span
                          className={`font-mono text-xs font-medium px-2.5 py-1 rounded-md leading-normal ${
                            isUrgent ? 'bg-rose-100 text-rose-800 font-bold' : 'bg-warm-100 text-warm-800'
                          }`}
                        >
                          {ago(ticket.ts)}
                        </span>
                      </div>

                      {/* Dishes Checklist */}
                      <div className="space-y-2.5">
                        {ticket.items.map((it, idx) => {
                          const key = `${ticket.id}_${it.id ?? idx}`
                          const isStruck = !!struckItems[key]
                          return (
                            <div
                              key={it.id ?? idx}
                              onClick={() => toggleItemStrike(key)}
                              className={`cursor-pointer rounded-xl p-3 sm:p-3.5 transition border ${
                                isStruck
                                  ? 'bg-warm-50 border-warm-200 line-through opacity-50'
                                  : 'bg-warm-50/60 border-warm-200 hover:bg-warm-100/70'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3 text-xs sm:text-sm">
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <span className="w-7 shrink-0 font-mono text-brand font-bold leading-snug pt-0.5">
                                    {it.qty}×
                                  </span>
                                  <div className="min-w-0 flex-1 space-y-2">
                                    <p className="font-medium text-warm-900 leading-snug break-words">
                                      {it.name}
                                    </p>
                                    {(it.name?.includes('🎁') || it.price === 0 || it.is_member_exclusive) && (
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {(it.name?.includes('🎁') || it.price === 0) ? (
                                          <span className="inline-flex items-center rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold leading-normal tracking-wide px-2 py-0.5">
                                            🎁 Complimentary Reward
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center rounded-md bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-bold leading-normal tracking-wide px-2 py-0.5">
                                            ✦ VIP Exclusive
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {it.notes && (
                                      <p className="inline-block rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium leading-snug tracking-normal text-amber-900 break-words">
                                        {it.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                                  <span className="rounded-md bg-warm-100 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-warm-600 leading-normal">
                                    {isStruck ? 'DONE' : 'PLATING'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleRemoveItem(e, ticket.table, it)}
                                    disabled={removingItemId === it.id}
                                    className="h-7 w-7 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40 flex items-center justify-center text-xs transition"
                                    title="Remove unavailable item"
                                    aria-label={`Remove ${it.name}`}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Ticket notes */}
                      {ticket.notes && (
                        <div className="rounded-xl bg-sky-50 border border-sky-200 px-3 py-2.5 text-xs leading-relaxed text-sky-950">
                          <span className="font-semibold">Instructions:</span> {ticket.notes}
                        </div>
                      )}

                      {/* Advance Button */}
                      <button
                        onClick={() => advance(ticket.id, stg.next)}
                        className="w-full rounded-xl bg-brand py-2.5 sm:py-3 px-4 font-display text-xs sm:text-sm font-semibold tracking-wider text-white uppercase shadow-xs hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white active:scale-[0.98] transition"
                      >
                        {stg.btn} →
                      </button>
                    </div>
                  )
                }))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
