import React, { useState, useMemo } from 'react'
import { api, money, inp, timeStr } from '../lib'
import { useDialog } from '../context/DialogContext'

export default function InventoryManagement({ data = {}, reload = () => {}, canManage = false, userName = '' }) {
  const { confirm: confirmDialog } = useDialog()
  const { ingredients = [], alerts = [] } = data || {}
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'low' | 'out' | 'healthy'
  const [sortBy, setSortBy] = useState('urgency') // 'urgency' | 'name' | 'qty_asc' | 'qty_desc' | 'val_desc'

  // Modals & Panels
  const [showAdd, setShowAdd] = useState(false)
  const [editingIng, setEditingIng] = useState(null)
  const [restockIng, setRestockIng] = useState(null)
  const [auditIng, setAuditIng] = useState(null)
  const [alertPromptIng, setAlertPromptIng] = useState(null)
  const [showReorderSheet, setShowReorderSheet] = useState(false)
  const [copiedPO, setCopiedPO] = useState(false)

  // Executive KPI summary
  const stats = useMemo(() => {
    let totalValuation = 0
    let lowCount = 0
    let outCount = 0
    let healthyCount = 0

    ingredients.forEach((i) => {
      totalValuation += Number(i.quantity || 0) * Number(i.cost_per_unit || 0)
      if (i.status === 'out_of_stock') outCount++
      else if (i.status === 'low_stock') lowCount++
      else healthyCount++
    })

    return {
      totalValuation,
      totalCount: ingredients.length,
      lowCount,
      outCount,
      healthyCount,
      criticalCount: lowCount + outCount,
    }
  }, [ingredients])

  // Filtered & sorted list
  const filtered = useMemo(() => {
    let list = ingredients.filter((i) => {
      const matchSearch =
        !search.trim() ||
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.unit.toLowerCase().includes(search.toLowerCase())

      if (!matchSearch) return false

      if (filter === 'low') return i.status === 'low_stock'
      if (filter === 'out') return i.status === 'out_of_stock'
      if (filter === 'healthy') return i.status === 'in_stock'
      return true
    })

    if (sortBy === 'name') {
      return list.sort((a, b) => a.name.localeCompare(b.name))
    }
    if (sortBy === 'qty_asc') {
      return list.sort((a, b) => Number(a.quantity) - Number(b.quantity))
    }
    if (sortBy === 'qty_desc') {
      return list.sort((a, b) => Number(b.quantity) - Number(a.quantity))
    }
    if (sortBy === 'val_desc') {
      return list.sort((a, b) => {
        const valA = Number(a.quantity || 0) * Number(a.cost_per_unit || 0)
        const valB = Number(b.quantity || 0) * Number(b.cost_per_unit || 0)
        return valB - valA
      })
    }

    // Default 'urgency' sort: Out of stock first, then low stock, then alphabetical
    const weight = { out_of_stock: 0, low_stock: 1, in_stock: 2 }
    return list.sort((a, b) => {
      const wA = weight[a.status] ?? 2
      const wB = weight[b.status] ?? 2
      if (wA !== wB) return wA - wB
      return a.name.localeCompare(b.name)
    })
  }, [ingredients, search, filter, sortBy])

  // Reorder items calculation for procurement sheet
  const reorderItems = useMemo(() => {
    return ingredients
      .filter((i) => i.status === 'low_stock' || i.status === 'out_of_stock')
      .map((i) => {
        const target = Number(i.min_threshold) * 2
        const needed = Math.max(1, Math.round((target - Number(i.quantity)) * 10) / 10)
        const cost = i.cost_per_unit ? needed * Number(i.cost_per_unit) : null
        return {
          ...i,
          needed,
          target,
          estCost: cost,
        }
      })
  }, [ingredients])

  const totalReorderEstCost = useMemo(() => {
    return reorderItems.reduce((acc, i) => acc + (i.estCost || 0), 0)
  }, [reorderItems])

  // Quick incremental step adjustment
  const adjust = async (ing, delta) => {
    const nextVal = Math.max(0, Math.round((Number(ing.quantity) + delta) * 100) / 100)
    try {
      await api(`/staff/ingredients/${ing.id}`, { method: 'PATCH', body: { quantity: nextVal } })
      reload()
    } catch (err) {
      alert(err.message || 'Failed to adjust stock')
    }
  }

  // Delete supply item
  const handleDelete = async (ing) => {
    const ok = await confirmDialog({
      title: 'Delete Inventory Item',
      message: `Are you sure you want to permanently delete "${ing.name}" from inventory? Stock history will be removed.`,
      confirmText: 'Yes, Delete Supply',
      cancelText: 'Cancel',
      type: 'danger',
    })
    if (!ok) return
    try {
      await api(`/staff/ingredients/${ing.id}`, { method: 'DELETE' })
      reload()
    } catch (err) {
      alert(err.message || 'Failed to remove supply')
    }
  }

  // Dispatch custom kitchen alert
  const sendAlert = async (ing, reason) => {
    try {
      await api(`/staff/ingredients/${ing.id}/notify-low`, {
        method: 'POST',
        body: { note: `${reason || 'Stock low'} (${userName || 'Kitchen'})` },
      })
      setAlertPromptIng(null)
      alert(`Stock warning dispatched for "${ing.name}". Floor manager and owner notified!`)
      reload()
    } catch (e) {
      alert(e.message || 'Failed to dispatch alert')
    }
  }

  const resolveAlert = async (id) => {
    await api(`/staff/stock-alerts/${id}/resolve`, { method: 'PATCH' })
    reload()
  }

  const copyPOText = () => {
    const lines = [
      `PURCHASE REORDER SHEET - MOLS MAISON`,
      `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      `Total Needed SKUs: ${reorderItems.length}`,
      `Estimated Procurement: $${totalReorderEstCost.toFixed(2)}`,
      `----------------------------------------------------`,
      ...reorderItems.map(
        (i, idx) =>
          `${idx + 1}. ${i.name}\n   - Order: ${i.needed} ${i.unit}\n   - In Stock: ${i.quantity} ${i.unit} (Min Threshold: ${i.min_threshold} ${i.unit})` +
          (i.cost_per_unit ? `\n   - Est. Cost: $${(i.needed * Number(i.cost_per_unit)).toFixed(2)} ($${Number(i.cost_per_unit).toFixed(2)}/${i.unit})` : '')
      ),
      `----------------------------------------------------`,
      `Authorized by: ${userName || 'Floor Manager'}`,
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopiedPO(true)
    setTimeout(() => setCopiedPO(false), 3000)
  }

  return (
    <div className="space-y-4">
      {/* Active Kitchen Stock Alerts Ribbon */}
      {alerts.length > 0 && (
        <div className="rounded-3xl border border-rose-300 bg-rose-50 p-4 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
              <span>⚠️</span> Active Kitchen Stock Alerts ({alerts.length})
            </span>
            <span className="text-xs text-rose-700 font-medium">Immediate manager attention needed</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {alerts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-2xl bg-white p-3 text-xs sm:text-sm shadow-xs border border-rose-100 gap-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-warm-900 truncate">{a.ingredient_name}</p>
                  <p className="text-xs text-rose-800 line-clamp-1">{a.message}</p>
                  <p className="text-[10px] text-warm-400 font-mono mt-0.5">Reported by: {a.reported_by}</p>
                </div>
                {canManage && (
                  <button
                    onClick={() => resolveAlert(a.id)}
                    className="shrink-0 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs active:scale-95 transition"
                  >
                    Resolved ✓
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Executive KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-card">
          <p className="text-xs font-medium text-warm-500">Total Stock Value</p>
          <p className="font-display text-lg sm:text-2xl font-bold text-warm-900 mt-1 font-mono">
            {money(stats.totalValuation)}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Across {stats.totalCount} active supplies</p>
        </div>
        <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-card">
          <p className="text-xs font-medium text-warm-500">Tracked Supplies</p>
          <p className="font-display text-lg sm:text-2xl font-bold text-warm-900 mt-1">
            {stats.totalCount} <span className="text-xs font-normal text-warm-500">items</span>
          </p>
          <p className="text-[11px] text-warm-500 font-medium mt-0.5">{stats.healthyCount} in healthy supply</p>
        </div>
        <div
          className={`rounded-2xl border p-4 shadow-card ${
            stats.criticalCount > 0 ? 'border-amber-300 bg-amber-50/60' : 'border-warm-200 bg-white'
          }`}
        >
          <p className="text-xs font-medium text-warm-600">Low / Out of Stock</p>
          <p className="font-display text-lg sm:text-2xl font-bold text-amber-900 mt-1">
            {stats.criticalCount}{' '}
            <span className="text-xs font-normal text-amber-700">
              ({stats.outCount} out, {stats.lowCount} low)
            </span>
          </p>
          <p className="text-[11px] text-amber-800 font-medium mt-0.5">Needs procurement reorder</p>
        </div>
        <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-card">
          <p className="text-xs font-medium text-warm-500">Open Warnings</p>
          <p className="font-display text-lg sm:text-2xl font-bold text-warm-900 mt-1">
            {alerts.length} <span className="text-xs font-normal text-warm-500">alerts</span>
          </p>
          <p className="text-[11px] text-warm-500 font-medium mt-0.5">Real-time KDS notifications</p>
        </div>
      </div>

      {/* Control Bar: Search, Filters, Sorting & Reorder Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-warm-200 bg-white p-4 shadow-card">
        {/* Search Input */}
        <div className="flex-1 min-w-[220px]">
          <input
            type="text"
            placeholder="Search ingredients, meat, produce, units..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inp + ' w-full text-xs sm:text-sm'}
          />
        </div>

        {/* Filter Chips & Sorting */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Chips */}
          <div className="flex rounded-xl bg-warm-100 p-1 text-xs font-medium">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-lg px-2.5 py-1 transition ${
                filter === 'all'
                  ? 'bg-brand text-white hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white shadow-xs font-semibold'
                  : 'text-warm-600 hover:text-warm-950 hover:bg-warm-200/70 active:bg-warm-300 active:text-warm-950'
              }`}
            >
              All ({ingredients.length})
            </button>
            <button
              onClick={() => setFilter('low')}
              className={`rounded-lg px-2.5 py-1 transition ${
                filter === 'low'
                  ? 'bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200 hover:text-amber-950 active:bg-amber-300 active:text-amber-950 font-semibold shadow-xs'
                  : 'text-warm-600 hover:text-warm-950 hover:bg-warm-200/70 active:bg-warm-300 active:text-warm-950'
              }`}
            >
              Low ({stats.lowCount})
            </button>
            <button
              onClick={() => setFilter('out')}
              className={`rounded-lg px-2.5 py-1 transition ${
                filter === 'out'
                  ? 'bg-rose-100 text-rose-950 border border-rose-300 hover:bg-rose-200 hover:text-rose-950 active:bg-rose-300 active:text-rose-950 font-semibold shadow-xs'
                  : 'text-warm-600 hover:text-warm-950 hover:bg-warm-200/70 active:bg-warm-300 active:text-warm-950'
              }`}
            >
              Out ({stats.outCount})
            </button>
            <button
              onClick={() => setFilter('healthy')}
              className={`rounded-lg px-2.5 py-1 transition ${
                filter === 'healthy'
                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 hover:bg-emerald-200 hover:text-emerald-950 active:bg-emerald-300 active:text-emerald-950 font-semibold shadow-xs'
                  : 'text-warm-600 hover:text-warm-950 hover:bg-warm-200/70 active:bg-warm-300 active:text-warm-950'
              }`}
            >
              Healthy ({stats.healthyCount})
            </button>
          </div>

          {/* Sorting */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={inp + ' text-xs sm:text-sm py-1.5'}
          >
            <option value="urgency">Sort: Low Stock First</option>
            <option value="name">Sort: Name (A to Z)</option>
            <option value="qty_asc">Sort: Quantity (Low to High)</option>
            <option value="qty_desc">Sort: Quantity (High to Low)</option>
            <option value="val_desc">Sort: Valuation ($ High to Low)</option>
          </select>

          {/* Reorder Procurement Sheet */}
          <button
            onClick={() => setShowReorderSheet(true)}
            className="flex items-center gap-1.5 rounded-xl border border-warm-300 bg-warm-50 px-3 py-1.5 text-xs sm:text-sm font-semibold text-warm-800 hover:bg-warm-100 hover:text-warm-950 hover:border-warm-400 active:bg-warm-200 active:text-warm-950 active:scale-95 transition shadow-xs"
          >
            <span>📋</span>
            <span>Reorder Sheet</span>
            {stats.criticalCount > 0 && (
              <span className="rounded-full bg-rose-600 px-1.5 py-0.2 font-mono text-[10px] text-white">
                {stats.criticalCount}
              </span>
            )}
          </button>

          {canManage && (
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-xl bg-brand px-3.5 py-1.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white active:scale-95 transition"
            >
              + Add Supply
            </button>
          )}

          <button
            onClick={reload}
            className="rounded-xl bg-brand px-3 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Grid of Stock Items */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-warm-200 bg-white p-10 text-center text-warm-500">
          <p className="font-semibold text-warm-800 text-sm">No inventory items matched your filter</p>
          <p className="text-xs text-warm-500 mt-1">Try resetting search keywords or switching status filters.</p>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ing) => {
            const isLow = ing.status === 'low_stock'
            const isOut = ing.status === 'out_of_stock'
            const lineValuation = Number(ing.quantity || 0) * Number(ing.cost_per_unit || 0)
            const pctOfThreshold = Math.min(100, Math.round((Number(ing.quantity) / (Number(ing.min_threshold) * 2)) * 100))

            return (
              <div
                key={ing.id}
                className={`flex flex-col justify-between rounded-3xl border bg-white p-4 sm:p-5 shadow-card transition duration-150 hover:shadow-card-hover ${
                  isOut ? 'border-rose-400 bg-rose-50/20' : isLow ? 'border-amber-300 bg-amber-50/20' : 'border-warm-200'
                }`}
              >
                <div>
                  {/* Top Bar: Title, Status Badge & Actions Menu */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-bold text-warm-900 truncate">
                        {ing.name}
                      </h3>
                      <p className="text-[11px] font-mono text-warm-500 mt-0.5">
                        {ing.cost_per_unit ? `$${Number(ing.cost_per_unit).toFixed(2)} / ${ing.unit}` : 'Unit cost not set'}
                        {lineValuation > 0 && ` · Val: ${money(lineValuation)}`}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 font-mono text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        isOut
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : isLow
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isOut ? 'DEPLETED' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                    </span>
                  </div>

                  {/* Quantity & Unit Large Metric */}
                  <div className="mt-3 flex items-baseline gap-1.5 font-mono">
                    <span className="text-3xl font-bold text-warm-900">{ing.quantity}</span>
                    <span className="text-sm font-semibold text-warm-500">{ing.unit}</span>
                  </div>

                  {/* Mini Visual Stock Meter */}
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-warm-500">
                      <span>Threshold: {ing.min_threshold} {ing.unit}</span>
                      <span>{pctOfThreshold}% of buffer</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-warm-100">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isOut ? 'bg-rose-600' : isLow ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.max(4, pctOfThreshold)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Operations & Logging Tooling */}
                <div className="mt-4 pt-3 border-t border-warm-100 space-y-2.5">
                  {/* Quick Increment/Decrement Buttons + Audit Button */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-warm-600">Quick Adjust:</span>
                    <div className="flex items-center gap-1 font-mono text-xs font-medium">
                      <button
                        onClick={() => adjust(ing, -1)}
                        className="h-7 w-7 rounded-lg bg-warm-100 hover:bg-warm-200 hover:text-warm-950 text-warm-800 active:bg-warm-300 active:text-warm-950 active:scale-95 transition"
                        title="Deduct 1"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => adjust(ing, 1)}
                        className="h-7 w-7 rounded-lg bg-warm-100 hover:bg-warm-200 hover:text-warm-950 text-warm-800 active:bg-warm-300 active:text-warm-950 active:scale-95 transition"
                        title="Add 1"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => adjust(ing, 5)}
                        className="h-7 px-1.5 rounded-lg bg-warm-100 hover:bg-warm-200 hover:text-warm-950 text-warm-800 active:bg-warm-300 active:text-warm-950 active:scale-95 transition"
                        title="Add 5"
                      >
                        +5
                      </button>
                      <button
                        onClick={() => setAuditIng(ing)}
                        className="h-7 px-2 rounded-lg border border-warm-300 bg-white text-warm-800 hover:bg-warm-100 hover:text-warm-950 hover:border-warm-400 active:bg-warm-200 active:text-warm-950 font-sans text-[11px] font-semibold active:scale-95 transition shadow-2xs"
                        title="Set exact counted physical inventory"
                      >
                        Count
                      </button>
                    </div>
                  </div>

                  {/* Restock & Notify Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setRestockIng(ing)}
                      className="flex items-center justify-center gap-1 rounded-xl bg-emerald-50 border border-emerald-300 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 hover:text-emerald-950 hover:border-emerald-400 active:bg-emerald-200 active:text-emerald-950 active:scale-95 transition"
                    >
                      <span>🚚</span>
                      <span>Restock</span>
                    </button>
                    <button
                      onClick={() => setAlertPromptIng(ing)}
                      className="flex items-center justify-center gap-1 rounded-xl bg-amber-50 border border-amber-300 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 hover:text-amber-950 hover:border-amber-400 active:bg-amber-200 active:text-amber-950 active:scale-95 transition"
                    >
                      <span>🔔</span>
                      <span>Alert Low</span>
                    </button>
                  </div>

                  {/* Manager Edit & Delete Footer */}
                  {canManage && (
                    <div className="flex items-center justify-between pt-1 border-t border-warm-100/70 text-xs">
                      <button
                        onClick={() => setEditingIng(ing)}
                        className="font-medium text-warm-600 hover:text-warm-900 underline"
                      >
                        Edit Details
                      </button>
                      <button
                        onClick={() => handleDelete(ing)}
                        className="font-medium text-rose-600 hover:text-rose-800"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ---------------- MODALS & SLIDE-OVERS ---------------- */}

      {/* 1. Receive Restock Delivery Modal */}
      {restockIng && (
        <RestockModal
          ingredient={restockIng}
          onClose={() => setRestockIng(null)}
          onSaved={() => {
            setRestockIng(null)
            reload()
          }}
        />
      )}

      {/* 2. Physical Count / Stocktake Audit Modal */}
      {auditIng && (
        <AuditCountModal
          ingredient={auditIng}
          onClose={() => setAuditIng(null)}
          onSaved={() => {
            setAuditIng(null)
            reload()
          }}
        />
      )}

      {/* 3. Kitchen Contextual Alert Modal */}
      {alertPromptIng && (
        <KitchenAlertModal
          ingredient={alertPromptIng}
          onClose={() => setAlertPromptIng(null)}
          onSend={(reason) => sendAlert(alertPromptIng, reason)}
        />
      )}

      {/* 4. Edit Supply Details Modal */}
      {editingIng && (
        <EditSupplyModal
          ingredient={editingIng}
          onClose={() => setEditingIng(null)}
          onSaved={() => {
            setEditingIng(null)
            reload()
          }}
        />
      )}

      {/* 5. Add New Supply Modal */}
      {showAdd && (
        <AddSupplyModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false)
            reload()
          }}
        />
      )}

      {/* 6. Supplier Reorder Sheet & Purchase Order Modal */}
      {showReorderSheet && (
        <ReorderSheetModal
          items={reorderItems}
          totalCost={totalReorderEstCost}
          copied={copiedPO}
          onCopy={copyPOText}
          onClose={() => setShowReorderSheet(false)}
        />
      )}
    </div>
  )
}

// -------------------------------------------------------------
// SUB-MODALS FOR INVENTORY MANAGEMENT
// -------------------------------------------------------------

function RestockModal({ ingredient, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [newCost, setNewCost] = useState(ingredient.cost_per_unit || '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const projectedQty = Number(ingredient.quantity || 0) + (Number(amount) || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid restock quantity.')
      return
    }
    setBusy(true)
    try {
      await api(`/staff/ingredients/${ingredient.id}/restock`, {
        method: 'POST',
        body: {
          amount: Number(amount),
          cost_per_unit: newCost ? Number(newCost) : null,
          note: note.trim() || 'Shipment Restock',
        },
      })
      onSaved()
    } catch (err) {
      alert(err.message || 'Failed to record restock')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-warm-100 pb-3">
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">
              Receive Delivery Restock
            </h3>
            <p className="text-xs text-warm-500 font-mono mt-0.5">{ingredient.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-warm-400 hover:text-warm-700">✕</button>
        </div>

        <div className="rounded-2xl bg-warm-50 p-3.5 border border-warm-200/70 flex items-center justify-between">
          <div>
            <span className="text-xs text-warm-500 font-medium">Current Stock</span>
            <p className="font-mono text-lg font-bold text-warm-800">
              {ingredient.quantity} {ingredient.unit}
            </p>
          </div>
          <span className="text-warm-400 text-lg">→</span>
          <div>
            <span className="text-xs text-emerald-600 font-medium">After Restock</span>
            <p className="font-mono text-lg font-bold text-emerald-700">
              {projectedQty} {ingredient.unit}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">
            Quantity Received ({ingredient.unit}) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            autoFocus
            placeholder={`e.g. 10`}
            className={inp + ' w-full text-xs sm:text-sm font-mono text-lg py-2.5'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">
              Unit Cost ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 4.50"
              className={inp + ' w-full text-xs sm:text-sm font-mono'}
              value={newCost}
              onChange={(e) => setNewCost(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">
              Supplier / Note
            </label>
            <input
              type="text"
              placeholder="Invoice # / Vendor"
              className={inp + ' w-full text-xs sm:text-sm'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2.5 pt-2 border-t border-warm-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-warm-100 py-2.5 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 hover:text-white active:bg-emerald-800 active:text-white active:scale-95 transition"
          >
            {busy ? 'Saving...' : `Add +${amount || 0} ${ingredient.unit}`}
          </button>
        </div>
      </form>
    </div>
  )
}

function AuditCountModal({ ingredient, onClose, onSaved }) {
  const [exactQty, setExactQty] = useState(ingredient.quantity || 0)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api(`/staff/ingredients/${ingredient.id}`, {
        method: 'PATCH',
        body: { quantity: Number(exactQty) },
      })
      onSaved()
    } catch (err) {
      alert(err.message || 'Failed to update inventory count')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-warm-100 pb-3">
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">
              Stocktake Physical Audit
            </h3>
            <p className="text-xs text-warm-500 font-mono mt-0.5">{ingredient.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-warm-400 hover:text-warm-700">✕</button>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">
            Actual Physical Counted ({ingredient.unit})
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            autoFocus
            className={inp + ' w-full text-xs sm:text-sm font-mono text-xl py-2.5 font-bold'}
            value={exactQty}
            onChange={(e) => setExactQty(e.target.value)}
          />
          <p className="text-[11px] text-warm-500 mt-1">
            Replaces current logged count of {ingredient.quantity} {ingredient.unit}.
          </p>
        </div>

        <div className="flex gap-2.5 pt-2 border-t border-warm-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-warm-100 py-2.5 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-xl bg-brand py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white transition"
          >
            {busy ? 'Saving...' : 'Set Physical Count'}
          </button>
        </div>
      </form>
    </div>
  )
}

function KitchenAlertModal({ ingredient, onClose, onSend }) {
  const [selectedPreset, setSelectedPreset] = useState('Running low during service shift')
  const [customNote, setCustomNote] = useState('')

  const presets = [
    'Running low during service shift',
    'Only 2-3 portions remaining in cooler',
    'Damaged / spilled ingredient container',
    'Delivery did not arrive / vendor short',
    'Quality issue / near expiration date',
  ]

  const handleSend = () => {
    const note = customNote.trim() || selectedPreset
    onSend(note)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-warm-100 pb-3">
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-amber-900 flex items-center gap-1.5">
              <span>🔔</span> Dispatch Stock Alert
            </h3>
            <p className="text-xs text-warm-500 font-mono mt-0.5">{ingredient.name}</p>
          </div>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-700">✕</button>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-warm-700">Quick Reason:</label>
          <div className="space-y-1.5">
            {presets.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => {
                  setSelectedPreset(p)
                  setCustomNote('')
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition ${
                  selectedPreset === p && !customNote
                    ? 'bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200 hover:text-amber-950 active:bg-amber-300 active:text-amber-950 font-semibold shadow-xs'
                    : 'bg-warm-50 text-warm-700 border border-warm-200 hover:bg-warm-100 hover:text-warm-950 hover:border-warm-300 active:bg-warm-200 active:text-warm-950'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-700 mb-1">Or Custom Note:</label>
          <input
            type="text"
            placeholder="Type specific kitchen instruction..."
            className={inp + ' w-full text-xs'}
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
          />
        </div>

        <div className="flex gap-2.5 pt-2 border-t border-warm-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-warm-100 py-2.5 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="flex-1 rounded-xl bg-amber-600 py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-amber-700 hover:text-white active:bg-amber-800 active:text-white transition"
          >
            Dispatch Alert
          </button>
        </div>
      </div>
    </div>
  )
}

function EditSupplyModal({ ingredient, onClose, onSaved }) {
  const [name, setName] = useState(ingredient.name || '')
  const [unit, setUnit] = useState(ingredient.unit || 'kg')
  const [minThreshold, setMinThreshold] = useState(ingredient.min_threshold || '')
  const [costPerUnit, setCostPerUnit] = useState(ingredient.cost_per_unit || '')
  const [busy, setBusy] = useState(false)

  const quickUnits = ['kg', 'g', 'L', 'ml', 'pcs', 'cans', 'bottles', 'packs', 'boxes']

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api(`/staff/ingredients/${ingredient.id}`, {
        method: 'PATCH',
        body: {
          name: name.trim(),
          unit: unit.trim(),
          min_threshold: Number(minThreshold),
          cost_per_unit: costPerUnit ? Number(costPerUnit) : null,
        },
      })
      onSaved()
    } catch (err) {
      alert(err.message || 'Failed to update supply')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-warm-100 pb-3">
          <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">
            Edit Supply Item
          </h3>
          <button type="button" onClick={onClose} className="text-warm-400 hover:text-warm-700">✕</button>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">Supply Name *</label>
          <input
            required
            className={inp + ' w-full text-xs sm:text-sm'}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">Unit of Measure *</label>
          <input
            required
            className={inp + ' w-full text-xs sm:text-sm'}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
          <div className="flex flex-wrap gap-1 mt-1.5">
            {quickUnits.map((u) => (
              <button
                type="button"
                key={u}
                onClick={() => setUnit(u)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition ${
                  unit === u
                    ? 'bg-brand text-white hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white font-semibold'
                    : 'bg-warm-100 text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">
              Low-Stock Alert Threshold *
            </label>
            <input
              type="number"
              step="0.1"
              required
              className={inp + ' w-full text-xs sm:text-sm font-mono'}
              value={minThreshold}
              onChange={(e) => setMinThreshold(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">
              Cost Per Unit ($)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 5.50"
              className={inp + ' w-full text-xs sm:text-sm font-mono'}
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2.5 pt-2 border-t border-warm-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-warm-100 py-2.5 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-xl bg-brand py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white transition"
          >
            {busy ? 'Saving...' : 'Update Supply'}
          </button>
        </div>
      </form>
    </div>
  )
}

function AddSupplyModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    quantity: '',
    unit: 'kg',
    min_threshold: '5',
    cost_per_unit: '',
  })
  const [busy, setBusy] = useState(false)

  const quickUnits = ['kg', 'g', 'L', 'ml', 'pcs', 'cans', 'bottles', 'packs', 'boxes']

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/staff/ingredients', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          quantity: Number(form.quantity),
          unit: form.unit.trim(),
          min_threshold: Number(form.min_threshold),
          cost_per_unit: form.cost_per_unit ? Number(form.cost_per_unit) : null,
        },
      })
      onSaved()
    } catch (err) {
      alert(err.message || 'Failed to add supply')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-warm-100 pb-3">
          <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">
            Create Supply Track Item
          </h3>
          <button type="button" onClick={onClose} className="text-warm-400 hover:text-warm-700">✕</button>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">Item Name *</label>
          <input
            required
            placeholder="e.g. San Marzano Tomatoes, Atlantic Salmon"
            className={inp + ' w-full text-xs sm:text-sm'}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">Current Stock *</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="e.g. 15.0"
              className={inp + ' w-full text-xs sm:text-sm font-mono'}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">Unit of Measure *</label>
            <input
              required
              className={inp + ' w-full text-xs sm:text-sm'}
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {quickUnits.map((u) => (
            <button
              type="button"
              key={u}
              onClick={() => setForm({ ...form, unit: u })}
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition ${
                form.unit === u
                  ? 'bg-brand text-white hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white font-semibold'
                  : 'bg-warm-100 text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950'
              }`}
            >
              {u}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">
              Low Alert Threshold *
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="e.g. 5.0"
              className={inp + ' w-full text-xs sm:text-sm font-mono'}
              value={form.min_threshold}
              onChange={(e) => setForm({ ...form, min_threshold: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">
              Unit Cost ($)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 4.20"
              className={inp + ' w-full text-xs sm:text-sm font-mono'}
              value={form.cost_per_unit}
              onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-2.5 pt-2 border-t border-warm-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-warm-100 py-2.5 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-xl bg-brand py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white transition"
          >
            {busy ? 'Saving...' : 'Add Supply'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ReorderSheetModal({ items, totalCost, copied, onCopy, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-warm-100 pb-3">
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-warm-900 flex items-center gap-2">
              <span>📋</span> Vendor Procurement &amp; Reorder Sheet
            </h3>
            <p className="text-xs text-warm-500 font-mono mt-0.5">
              Auto-calculated reorder quantities based on buffer thresholds
            </p>
          </div>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-700">✕</button>
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center text-warm-500">
            <span className="text-3xl">🎉</span>
            <p className="mt-2 font-semibold text-warm-900 text-sm">All Inventory Levels are Healthy!</p>
            <p className="text-xs text-warm-500 mt-0.5">No ingredients are currently under their low-stock threshold.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-warm-600 px-1">
              <span>Items Needing Restock ({items.length})</span>
              <span>Estimated Total: <strong className="font-mono text-warm-900">{money(totalCost)}</strong></span>
            </div>

            <div className="border border-warm-200 rounded-2xl overflow-hidden shadow-2xs divide-y divide-warm-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-warm-50 text-warm-700 font-semibold border-b border-warm-200">
                  <tr>
                    <th className="p-3">Supply Item</th>
                    <th className="p-3">Current</th>
                    <th className="p-3">Min Buffer</th>
                    <th className="p-3 font-bold text-warm-900">Suggested Order</th>
                    <th className="p-3 text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100">
                  {items.map((i) => (
                    <tr key={i.id} className="hover:bg-warm-50/50">
                      <td className="p-3 font-medium text-warm-900">
                        {i.name}
                        {i.status === 'out_of_stock' && (
                          <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-rose-700">
                            DEPLETED
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-warm-600">{i.quantity} {i.unit}</td>
                      <td className="p-3 font-mono text-warm-500">{i.min_threshold} {i.unit}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">
                        +{i.needed} {i.unit}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-warm-900">
                        {i.estCost ? money(i.estCost) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-2.5 pt-2 border-t border-warm-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-warm-100 py-2.5 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950 transition"
          >
            Close
          </button>
          {items.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 rounded-xl border border-warm-300 bg-white py-2.5 text-xs sm:text-sm font-semibold text-warm-800 hover:bg-warm-100 hover:text-warm-950 hover:border-warm-400 active:bg-warm-200 active:text-warm-950 transition"
              >
                🖨️ Print Sheet
              </button>
              <button
                type="button"
                onClick={onCopy}
                className="flex-1 rounded-xl bg-brand py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white transition flex items-center justify-center gap-1.5"
              >
                <span>{copied ? '✓ Copied PO Text!' : '📋 Copy Supplier Text'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
