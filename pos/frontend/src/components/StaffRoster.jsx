import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { api, inp } from '../lib'
import { ROLES, Icons } from './Icons'
import { useDialog } from '../context/DialogContext'
import logo from '../assets/imgs/logo.jpg'

export default function StaffRoster({ currentUserId, reload = () => {} }) {
  const { confirm: confirmDialog, toast } = useDialog()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  // Modals
  const [showAdd, setShowAdd] = useState(false)
  const [formAdd, setFormAdd] = useState({ name: '', email: '', password: '', role: 'kitchen' })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  const [editingUser, setEditingUser] = useState(null)
  const [formEdit, setFormEdit] = useState({ name: '', email: '', password: '', role: 'kitchen' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Load staff users (Read)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await api('/staff/users')
      setUsers(Array.isArray(list) ? list : [])
      setError('')
    } catch (err) {
      console.warn('Failed to load staff roster:', err)
      setError(err.message || 'Unable to load staff roster. Manager, Owner, or Admin privileges required.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Filter and search
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = roleFilter === 'all' || u.role === roleFilter
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
      return matchRole && matchSearch
    })
  }, [users, roleFilter, search])

  // Add staff user (Create)
  const handleAdd = async (e) => {
    e.preventDefault()
    setAddError('')
    setAddLoading(true)
    try {
      const newUser = await api('/staff/users', { method: 'POST', body: formAdd })
      setShowAdd(false)
      setFormAdd({ name: '', email: '', password: '', role: 'kitchen' })
      toast(`Staff account "${newUser.name}" provisioned successfully!`, 'success')
      load()
      reload()
    } catch (err) {
      setAddError(err.message || 'Failed to create staff account')
    } finally {
      setAddLoading(false)
    }
  }

  // Open Edit Modal
  const openEdit = (u) => {
    setEditingUser(u)
    setFormEdit({
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'kitchen',
      password: '', // Empty means don't change
    })
    setEditError('')
  }

  // Update staff user (Update)
  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editingUser) return
    setEditError('')
    setEditLoading(true)
    try {
      const payload = {
        name: formEdit.name,
        email: formEdit.email,
        role: formEdit.role,
      }
      if (formEdit.password && formEdit.password.trim().length > 0) {
        payload.password = formEdit.password.trim()
      }

      const updated = await api(`/staff/users/${editingUser.id}`, {
        method: 'PATCH',
        body: payload,
      })

      setEditingUser(null)
      toast(`Staff credentials for "${updated.name}" updated!`, 'success')
      load()
      reload()
    } catch (err) {
      setEditError(err.message || 'Failed to update staff account')
    } finally {
      setEditLoading(false)
    }
  }

  // Delete staff user (Delete)
  const handleDelete = async (u) => {
    if (u.id === currentUserId) {
      toast('Cannot delete your own currently signed-in account.', 'warning')
      return
    }

    const ok = await confirmDialog({
      title: 'Revoke Staff Access',
      message: `Are you sure you want to permanently revoke system access for "${u.name}" (${u.email})?`,
      confirmText: 'Yes, Revoke Access',
      cancelText: 'Cancel / Keep',
      type: 'danger',
    })
    if (!ok) return

    try {
      await api(`/staff/users/${u.id}`, { method: 'DELETE' })
      toast(`Account for "${u.name}" has been removed.`, 'info')
      load()
      reload()
    } catch (err) {
      toast(err.message || 'Failed to delete user', 'error')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-warm-200 bg-white p-5 sm:p-6 shadow-card">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warm-100 text-warm-800 border border-warm-200 shadow-xs">
            <Icons.Users />
          </div>
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-warm-900">
              Staff Credentials Roster
            </h2>
            <p className="text-xs text-warm-500 font-mono mt-0.5">
              Authorized access: Manager, Owner, and Admin · Role assignments &amp; terminal security
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAdd(true)
            setAddError('')
          }}
          className="rounded-2xl bg-warm-900 px-4 py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-soft hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <span className="text-base leading-none">+</span>
          <span>Add New Staff</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs sm:text-sm text-amber-900 shadow-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={load}
            className="rounded-lg bg-amber-200/80 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-300 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-warm-200 bg-white p-3.5 shadow-card">
        {/* Search */}
        <div className="w-full sm:w-72 relative">
          <input
            type="text"
            placeholder="Search staff by name, email or role..."
            className={inp + ' text-xs sm:text-sm py-2 pl-9 pr-3 w-full'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="absolute left-3 top-2.5 text-warm-400 text-xs">🔍</span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-xs text-warm-400 hover:text-warm-700"
            >
              ✕
            </button>
          )}
        </div>

        {/* Role Pills */}
        <div className="thin-scrollbar flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto py-0.5">
          {[
            { id: 'all', label: 'All Roles' },
            { id: 'owner', label: 'Owner' },
            { id: 'manager', label: 'Manager' },
            { id: 'cashier', label: 'Cashier' },
            { id: 'kitchen', label: 'Kitchen' },
            { id: 'admin', label: 'Admin' },
          ].map((r) => {
            const active = roleFilter === r.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoleFilter(r.id)}
                className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-warm-900 text-white shadow-xs'
                    : 'bg-warm-100/70 text-warm-700 hover:bg-warm-200/80 hover:text-warm-950'
                }`}
              >
                {r.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Staff Roster Grid / List */}
      <div className="rounded-3xl border border-warm-200 bg-white shadow-card overflow-hidden">
        <div className="px-5 py-3.5 bg-warm-50/70 border-b border-warm-200/80 flex items-center justify-between text-xs font-semibold text-warm-600">
          <span>Active Staff Members ({filteredUsers.length})</span>
          <span className="font-mono text-[11px] text-warm-400">Add · Read · Update · Delete</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs sm:text-sm text-warm-500 font-mono">
            Loading staff credentials...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-display font-semibold text-warm-700">No staff members found</p>
            <p className="text-xs text-warm-400 mt-1 font-mono">
              {search ? 'Try clearing your search query.' : 'Click "+ Add New Staff" above to create an account.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-warm-100">
            {filteredUsers.map((u) => {
              const r = ROLES[u.role] || { title: u.role, badge: 'bg-warm-100 text-warm-800 border-warm-200' }
              const isCurrent = u.id === currentUserId

              return (
                <div
                  key={u.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 hover:bg-warm-50/50 transition"
                >
                  {/* Staff Info */}
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warm-100 font-display font-bold text-warm-800 text-sm border border-warm-200">
                      {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-warm-900 text-sm sm:text-base">
                          {u.name}
                        </span>
                        {isCurrent && (
                          <span className="rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            You
                          </span>
                        )}
                        <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${r.badge}`}>
                          {r.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-warm-500 font-mono">
                        <span>{u.email}</span>
                        {u.created_at && (
                          <>
                            <span>·</span>
                            <span>Added {new Date(u.created_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Edit & Delete) */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="rounded-xl border border-warm-300 bg-white px-3 py-1.5 text-xs font-semibold text-warm-700 hover:bg-warm-100 hover:text-warm-950 hover:border-warm-400 active:bg-warm-200 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                  
                      <span>Edit</span>
                    </button>

                    {isCurrent ? (
                      <span className="text-[11px] font-mono text-warm-400 px-2 py-1 italic">
                        Active Terminal
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:text-rose-900 hover:border-rose-300 active:bg-rose-200 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                       
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Provision Staff Modal (ADD) */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowAdd(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-warm-200 text-left transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Brand Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-warm-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-white border border-warm-200 p-0.5 overflow-hidden shadow-xs">
                  <img src={logo} alt="MOLS MAISON" className="h-full w-full object-contain rounded-md" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-warm-900">Provision Staff Account</h3>
                  <p className="text-[11px] text-warm-500 font-mono">Create new credentials for terminal access</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded-xl p-1 text-warm-400 hover:bg-warm-100 hover:text-warm-700 transition"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700">
                {addError}
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-warm-700 mb-1">
                  Full Name
                </label>
                <input
                  required
                  placeholder="e.g. John Doe"
                  className={inp + ' text-xs sm:text-sm w-full'}
                  value={formAdd.name}
                  onChange={(e) => setFormAdd({ ...formAdd, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-warm-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jdoe@mail.com"
                  className={inp + ' text-xs sm:text-sm font-mono w-full'}
                  value={formAdd.email}
                  onChange={(e) => setFormAdd({ ...formAdd, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-warm-700 mb-1">
                    Password (min 6 chars)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className={inp + ' text-xs sm:text-sm font-mono w-full'}
                    value={formAdd.password}
                    onChange={(e) => setFormAdd({ ...formAdd, password: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-warm-700 mb-1">
                    System Role
                  </label>
                  <select
                    value={formAdd.role}
                    onChange={(e) => setFormAdd({ ...formAdd, role: e.target.value })}
                    className={inp + ' text-xs sm:text-sm font-semibold w-full'}
                  >
                    <option value="kitchen">Kitchen Staff (KDS)</option>
                    <option value="cashier">Cashier (POS)</option>
                    <option value="manager">Floor Manager</option>
                    <option value="owner">Restaurant Owner</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-2 border-t border-warm-100">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="rounded-xl border border-warm-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-warm-700 hover:bg-warm-100 transition shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="rounded-xl bg-warm-900 px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-soft hover:bg-warm-800 active:bg-warm-950 transition disabled:opacity-50"
                >
                  {addLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal (UPDATE) */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setEditingUser(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-warm-200 text-left transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Brand Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-warm-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-white border border-warm-200 p-0.5 overflow-hidden shadow-xs">
                  <img src={logo} alt="MOLS MAISON" className="h-full w-full object-contain rounded-md" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-warm-900">
                    Edit Staff Credentials
                  </h3>
                  <p className="text-[11px] text-warm-500 font-mono">
                    Updating account ID #{editingUser.id} ({editingUser.name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-xl p-1 text-warm-400 hover:bg-warm-100 hover:text-warm-700 transition"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-warm-700 mb-1">
                  Full Name
                </label>
                <input
                  required
                  className={inp + ' text-xs sm:text-sm w-full'}
                  value={formEdit.name}
                  onChange={(e) => setFormEdit({ ...formEdit, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-warm-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  className={inp + ' text-xs sm:text-sm font-mono w-full'}
                  value={formEdit.email}
                  onChange={(e) => setFormEdit({ ...formEdit, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-warm-700 mb-1">
                    System Role
                  </label>
                  <select
                    value={formEdit.role}
                    onChange={(e) => setFormEdit({ ...formEdit, role: e.target.value })}
                    className={inp + ' text-xs sm:text-sm font-semibold w-full'}
                  >
                    <option value="kitchen">Kitchen Staff (KDS)</option>
                    <option value="cashier">Cashier (POS)</option>
                    <option value="manager">Floor Manager</option>
                    <option value="owner">Restaurant Owner</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-warm-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    placeholder="Leave blank to keep current"
                    className={inp + ' text-xs sm:text-sm font-mono w-full'}
                    value={formEdit.password}
                    onChange={(e) => setFormEdit({ ...formEdit, password: e.target.value })}
                  />
                  <p className="mt-1 text-[10px] text-warm-400 font-mono">
                    Only fill if resetting password (min 6 chars)
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-2 border-t border-warm-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-warm-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-warm-700 hover:bg-warm-100 transition shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-xl bg-warm-900 px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-soft hover:bg-warm-800 active:bg-warm-950 transition disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
