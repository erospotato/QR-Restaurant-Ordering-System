import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, formatImageUrl, money, playChime, timeStr, useLive } from '../lib'

// Clean bespoke SVG Icons
const Icons = {
  Utensils: () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  Search: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Bag: () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  Bell: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Check: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  Flame: () => (
    <svg className="h-4 w-4 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.527.82-1.127 2.18-1.574 3.28-.458 1.127-.796 2.083-1.077 2.76A8.04 8.04 0 017 5.6a1 1 0 00-1.632-.782 8.003 8.003 0 00-3.328 6.07C2 15.362 5.582 19 10 19s8-3.638 8-8.112a8.045 8.045 0 00-1.89-5.187 1 1 0 00-1.423-.102c-.31.282-.596.586-.856.912-.663.83-1.066 1.34-1.436 1.34-.37 0-.773-.51-1.436-1.34a17.29 17.29 0 01-.564-.958z" clipRule="evenodd" />
    </svg>
  ),
  Star: () => (
    <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ),
  Close: () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
}

const STAGE_PROGRESS = {
  new: { label: 'Received by Kitchen', step: 1, color: 'text-blue-600', bg: 'bg-blue-600' },
  preparing: { label: 'Chef is Cooking', step: 2, color: 'text-amber-600', bg: 'bg-amber-600' },
  ready: { label: 'Ready for Service', step: 3, color: 'text-emerald-600', bg: 'bg-emerald-600' },
  served: { label: 'Served to Table', step: 4, color: 'text-stone-600', bg: 'bg-stone-600' },
}

export default function Customer() {
  const { token } = useParams()
  const [tableInfo, setTableInfo] = useState(null)
  const [menu, setMenu] = useState([])
  const [orders, setOrders] = useState([])
  const [invalid, setInvalid] = useState(false)
  const [loading, setLoading] = useState(true)

  // Navigation
  const [tab, setTab] = useState('menu') // 'menu' | 'orders'

  // Filtering & Search
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Cart state: { [id]: { qty: number, notes: string, spice: string } }
  const [cart, setCart] = useState({})
  const [orderLevelNote, setOrderLevelNote] = useState('')

  // Modals & Drawers
  const [activeItemModal, setActiveItemModal] = useState(null)
  const [modalSpice, setModalSpice] = useState('Default')
  const [modalNotes, setModalNotes] = useState('')
  const [modalQty, setModalQty] = useState(1)

  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showCallStaffModal, setShowCallStaffModal] = useState(false)

  // Alerts & Submitting states
  const [serviceAlert, setServiceAlert] = useState('')
  const [orderSuccessToast, setOrderSuccessToast] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load table, menu, and orders
  const loadData = useCallback(async () => {
    try {
      const [t, m, o] = await Promise.all([
        api(`/tables/${token}`),
        api('/menu'),
        api(`/tables/${token}/orders`),
      ])
      setTableInfo(t)
      setMenu(m || [])
      setOrders(o || [])
    } catch (err) {
      if (err.status === 404) setInvalid(true)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadData()
  }, [loadData])

  useLive(false, loadData)

  const openCustomizer = (item) => {
    const existing = cart[item.id]
    setActiveItemModal(item)
    setModalQty(existing ? existing.qty : 1)
    setModalSpice(existing?.spice || 'Default')
    setModalNotes(existing?.notes || '')
  }

  const confirmCustomization = () => {
    if (!activeItemModal) return
    const id = activeItemModal.id
    setCart((prev) => ({
      ...prev,
      [id]: {
        qty: modalQty,
        spice: modalSpice !== 'Default' ? modalSpice : '',
        notes: modalNotes.trim(),
      },
    }))
    setActiveItemModal(null)
  }

  const adjustQty = (id, delta) => {
    setCart((prev) => {
      const current = prev[id] || { qty: 0, notes: '', spice: '' }
      const newQty = Math.max(0, current.qty + delta)
      if (newQty === 0) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: { ...current, qty: newQty } }
    })
  }

  const callStaff = async (type, notes = '') => {
    try {
      await api(`/tables/${token}/call-waiter`, {
        method: 'POST',
        body: { type, notes },
      })
      setShowCallStaffModal(false)
      setServiceAlert(`Staff notified: ${type.toUpperCase()}. We will assist your table shortly.`)
      setTimeout(() => setServiceAlert(''), 4500)
    } catch (e) {
      alert(e.message || 'Failed to call staff')
    }
  }

  const submitOrder = async () => {
    if (isSubmitting || Object.keys(cart).length === 0) return
    setIsSubmitting(true)
    try {
      const itemsPayload = Object.entries(cart)
        .filter(([, v]) => v.qty > 0)
        .map(([id, v]) => {
          const dishNotesParts = []
          if (v.spice) dishNotesParts.push(`[${v.spice}]`)
          if (v.notes) dishNotesParts.push(v.notes)
          return {
            id: Number(id),
            qty: v.qty,
            notes: dishNotesParts.join(' ') || null,
          }
        })

      await api('/orders', {
        method: 'POST',
        body: {
          token,
          notes: orderLevelNote.trim() || null,
          items: itemsPayload,
        },
      })

      playChime('ticket')
      setCart({})
      setOrderLevelNote('')
      setShowConfirmModal(false)
      setShowCartDrawer(false)
      setOrderSuccessToast(true)
      setTab('orders')
      loadData()
      setTimeout(() => setOrderSuccessToast(false), 5000)
    } catch (err) {
      alert(err.message || 'Order failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const categories = useMemo(() => {
    return [...new Set(menu.map((m) => m.category).filter(Boolean))]
  }, [menu])

  const filteredDishes = useMemo(() => {
    return menu.filter((item) => {
      const matchesSearch =
        !search.trim() ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(search.toLowerCase()))

      if (!matchesSearch) return false

      if (selectedCategory === 'top_sale') return item.is_top_sale
      if (selectedCategory === 'signature') return item.is_signature
      if (selectedCategory !== 'all') return item.category === selectedCategory

      return true
    })
  }, [menu, search, selectedCategory])

  const cartTotalQty = useMemo(() => {
    return Object.values(cart).reduce((sum, item) => sum + item.qty, 0)
  }, [cart])

  const cartTotalPrice = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, val]) => {
      const dish = menu.find((m) => m.id === Number(id))
      return sum + (dish ? dish.price * val.qty : 0)
    }, 0)
  }, [cart, menu])

  const totalBillAllRounds = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.total || 0), 0)
  }, [orders])

  if (invalid) {
    return (
      <div className="grid min-h-screen place-items-center bg-warm-100 p-6 text-center">
        <div className="max-w-sm rounded-3xl bg-white p-8 shadow-card border border-warm-200">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-brand">
            <Icons.Utensils />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-warm-900">Table QR Inactive</h1>
          <p className="mt-2 text-sm text-warm-600 leading-relaxed">
            This QR code is either expired or unassigned. Please ask our restaurant server to assist your table.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-warm-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-brand border-t-transparent" />
          <span className="font-display text-sm font-bold tracking-wider text-warm-700 uppercase">
            Loading Dining Experience...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900 font-sans pb-36">
      {/* Toast Alert on Service Call */}
      {serviceAlert && (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3 rounded-2xl bg-warm-900 px-4 py-3 text-sm font-semibold text-white shadow-floating">
            <span className="text-amber-400">🛎️</span>
            <p className="flex-1">{serviceAlert}</p>
          </div>
        </div>
      )}

      {/* Toast Notification on Order Placed */}
      {orderSuccessToast && (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-700 px-4 py-3.5 text-white shadow-floating">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <Icons.Check />
            </span>
            <div className="flex-1 text-sm">
              <p className="font-bold">Order Received by Kitchen</p>
              <p className="text-emerald-100 text-xs">Preparing freshly for your table. Add more dishes anytime!</p>
            </div>
          </div>
        </div>
      )}

      {/* Brand Header & Table Info */}
      <header className="sticky top-0 z-30 border-b border-warm-200/90 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warm-900 text-white shadow-xs">
              <span className="font-display text-sm font-bold tracking-wider text-brand-300">MR</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-base sm:text-lg font-bold tracking-tight text-warm-900 truncate">
                MOLS RESTO
              </h1>
              <p className="text-xs font-medium text-warm-500 truncate max-w-[130px] sm:max-w-xs">
                Table #{tableInfo?.table} {tableInfo?.merged_with ? `· Merged with ${tableInfo.merged_with}` : ''}
              </p>
            </div>
          </div>

          {/* Quick Actions: Call Waiter & Tab Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowCallStaffModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-warm-300 bg-warm-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-warm-800 hover:bg-warm-100 transition active:scale-95 shadow-xs"
              title="Request table service"
            >
              <Icons.Bell />
              <span className="hidden sm:inline">Call Staff</span>
            </button>

            {/* Menu / Orders Tabs */}
            <div className="flex rounded-xl bg-warm-100 p-1 text-xs sm:text-sm font-medium">
              <button
                onClick={() => setTab('menu')}
                className={`rounded-lg px-3 py-1 transition ${
                  tab === 'menu' ? 'bg-white text-warm-900 shadow-xs font-semibold' : 'text-warm-600 hover:text-warm-900'
                }`}
              >
                Menu
              </button>
              <button
                onClick={() => setTab('orders')}
                className={`relative rounded-lg px-3 py-1 transition ${
                  tab === 'orders' ? 'bg-white text-warm-900 shadow-xs font-semibold' : 'text-warm-600 hover:text-warm-900'
                }`}
              >
                Orders
                {orders.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-brand px-1.5 py-0.2 font-mono text-[11px] font-semibold text-white">
                    {orders.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar & Category Filters (Menu tab) */}
        {tab === 'menu' && (
          <div className="border-t border-warm-100 bg-white/70 px-4 py-2.5">
            <div className="mx-auto max-w-3xl space-y-2.5">
              {/* Search Bar with Refined Readable Font */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search dishes, drinks, ingredients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-warm-300 bg-warm-50/70 py-2 pl-9 pr-8 text-sm font-normal text-warm-900 placeholder-warm-400 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
                />
                <span className="absolute left-3 top-2.5 text-warm-400">
                  <Icons.Search />
                </span>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-2.5 text-warm-400 hover:text-warm-700"
                  >
                    <Icons.Close />
                  </button>
                )}
              </div>

              {/* Category Pills (Clean weight, no overflow) */}
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`whitespace-nowrap rounded-full px-3.5 py-1 text-xs sm:text-sm font-medium transition ${
                    selectedCategory === 'all'
                      ? 'bg-warm-900 text-white shadow-xs'
                      : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
                  }`}
                >
                  All Items
                </button>
                <button
                  onClick={() => setSelectedCategory('top_sale')}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1 text-xs sm:text-sm font-medium transition ${
                    selectedCategory === 'top_sale'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <Icons.Flame />
                  <span>Top Sellers</span>
                </button>
                <button
                  onClick={() => setSelectedCategory('signature')}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1 text-xs sm:text-sm font-medium transition ${
                    selectedCategory === 'signature'
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Icons.Star />
                  <span>Chef's Choice</span>
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`whitespace-nowrap rounded-full px-3.5 py-1 text-xs sm:text-sm font-medium transition ${
                      selectedCategory === c
                        ? 'bg-brand text-white shadow-xs'
                        : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content View */}
      <main className="mx-auto max-w-3xl px-4 pt-3.5">
        {tab === 'menu' ? (
          <div>
            {/* Header info */}
            <div className="mb-3 flex items-center justify-between text-xs sm:text-sm text-warm-600 font-medium">
              <span>
                Available dishes ({filteredDishes.length})
              </span>
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="font-medium text-brand hover:underline"
                >
                  Reset filter
                </button>
              )}
            </div>

            {/* Empty Search Result */}
            {filteredDishes.length === 0 && (
              <div className="rounded-3xl border border-warm-200 bg-white p-10 text-center shadow-card">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warm-100 text-warm-400">
                  <Icons.Search />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-warm-900">No dishes match</h3>
                <p className="mt-1 text-xs sm:text-sm text-warm-500">
                  Try adjusting your search terms or selecting another category.
                </p>
                <button
                  onClick={() => {
                    setSearch('')
                    setSelectedCategory('all')
                  }}
                  className="mt-3.5 rounded-xl bg-warm-900 px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-warm-800 transition"
                >
                  View All Menu
                </button>
              </div>
            )}

            {/* GRIDBOX MENU (Clean legible cards with zero overflow) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {filteredDishes.map((item) => {
                const inCart = cart[item.id] || { qty: 0, notes: '', spice: '' }
                const imageUrl = formatImageUrl(item.image_url)

                return (
                  <div
                    key={item.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-warm-200 bg-white shadow-card transition-all duration-200 hover:shadow-soft"
                  >
                    {/* Dish Photo */}
                    <div
                      onClick={() => openCustomizer(item)}
                      className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden bg-warm-100"
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div
                        className="h-full w-full items-center justify-center bg-gradient-to-br from-warm-100 to-warm-200 text-warm-400"
                        style={{ display: imageUrl ? 'none' : 'flex' }}
                      >
                        <Icons.Utensils />
                      </div>

                      {/* Badges Overlay */}
                      <div className="absolute left-2 top-2 flex flex-col gap-1">
                        {item.is_top_sale && (
                          <span className="flex items-center gap-1 rounded-md bg-warm-900/90 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs shadow-xs">
                            <Icons.Flame />
                            <span>Top</span>
                          </span>
                        )}
                        {item.is_signature && (
                          <span className="flex items-center gap-1 rounded-md bg-amber-600/90 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs shadow-xs">
                            <Icons.Star />
                            <span>Chef</span>
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-2 right-2 rounded-md bg-white/95 px-1.5 py-0.5 text-[11px] font-medium text-warm-800 shadow-xs backdrop-blur-xs">
                        Details
                      </div>
                    </div>

                    {/* Card Content with refined text */}
                    <div className="flex flex-1 flex-col justify-between p-3">
                      <div onClick={() => openCustomizer(item)} className="cursor-pointer">
                        <h3 className="font-display text-sm sm:text-base font-semibold leading-snug text-warm-900 group-hover:text-brand transition-colors line-clamp-1">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="mt-0.5 text-xs leading-relaxed text-warm-500 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Bottom Price & Add Action with Zero Overflow */}
                      <div className="mt-2.5 pt-2 border-t border-warm-100 flex items-center justify-between gap-1.5 min-w-0">
                        <span className="font-mono text-sm sm:text-base font-semibold text-warm-900 truncate">
                          {money(item.price)}
                        </span>

                        {inCart.qty > 0 ? (
                          <div className="flex items-center gap-1 rounded-full bg-warm-100 p-0.5 shadow-inner shrink-0">
                            <button
                              onClick={() => adjustQty(item.id, -1)}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-warm-800 shadow-xs active:scale-95"
                            >
                              −
                            </button>
                            <span className="w-4 text-center font-mono text-xs font-semibold text-warm-900">
                              {inCart.qty}
                            </span>
                            <button
                              onClick={() => adjustQty(item.id, 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-xs active:scale-95"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openCustomizer(item)}
                            className="shrink-0 flex items-center gap-1 rounded-lg bg-warm-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-brand active:scale-95 transition"
                          >
                            <span>+ Order</span>
                          </button>
                        )}
                      </div>

                      {/* Custom note badge if present */}
                      {(inCart.spice || inCart.notes) && inCart.qty > 0 && (
                        <div
                          onClick={() => openCustomizer(item)}
                          className="mt-2 cursor-pointer rounded-lg bg-warm-50 px-2 py-0.5 text-[11px] font-medium text-warm-700 border border-warm-200 truncate"
                        >
                          <span className="font-semibold text-brand">Note:</span> {inCart.spice} {inCart.notes}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ORDERS & BILLING TAB */
          <div className="space-y-4">
            {/* Running Table Bill Header */}
            <div className="rounded-3xl border border-warm-200 bg-white p-5 shadow-card flex items-center justify-between">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-warm-500">
                  Current Session Balance
                </span>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-warm-900 leading-tight">
                  {money(totalBillAllRounds)}
                </p>
                <p className="text-xs text-warm-500 mt-0.5">
                  Table #{tableInfo?.table} · All ordered rounds combined
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setTab('menu')}
                  className="rounded-xl bg-brand px-3.5 py-2 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-brand-dark active:scale-95 transition"
                >
                  + Add More Dishes
                </button>
                <button
                  onClick={() => callStaff('bill', 'Ready to settle bill')}
                  className="rounded-xl border border-warm-300 bg-warm-50 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-warm-800 hover:bg-warm-100 transition"
                >
                  Request Bill
                </button>
              </div>
            </div>

            {/* List of Ordered Tickets */}
            {orders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-warm-300 bg-white p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warm-100 text-warm-400">
                  <Icons.Bag />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-warm-900">No active tickets</h3>
                <p className="mt-1 text-xs sm:text-sm text-warm-500">
                  You haven't submitted any dishes yet. Browse the menu and place your first order.
                </p>
                <button
                  onClick={() => setTab('menu')}
                  className="mt-3.5 rounded-xl bg-warm-900 px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-xs"
                >
                  Explore Menu
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o, idx) => {
                  const stage = STAGE_PROGRESS[o.status] || STAGE_PROGRESS.new
                  return (
                    <div
                      key={o.id}
                      className="rounded-3xl border border-warm-200 bg-white p-4.5 shadow-card"
                    >
                      {/* Ticket Header & Progress */}
                      <div className="flex items-center justify-between border-b border-warm-100 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display text-sm sm:text-base font-bold text-warm-900">
                              Round #{orders.length - idx}
                            </span>
                            {o.addon && (
                              <span className="rounded-md bg-purple-50 px-1.5 py-0.2 text-[11px] font-medium text-purple-700 border border-purple-200">
                                Add-on
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-warm-500 mt-0.5">{timeStr(o.ts)}</p>
                        </div>

                        {/* Status Badge */}
                        <div className="text-right">
                          <span className={`font-display text-xs sm:text-sm font-semibold ${stage.color}`}>
                            {stage.label}
                          </span>
                          <div className="mt-1 flex items-center justify-end gap-1">
                            {[1, 2, 3, 4].map((s) => (
                              <span
                                key={s}
                                className={`h-1.5 w-3.5 rounded-full ${
                                  s <= stage.step ? stage.bg : 'bg-warm-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Items Ordered */}
                      <div className="my-3 space-y-2">
                        {o.items.map((it, k) => (
                          <div key={k} className="flex items-start justify-between text-xs sm:text-sm">
                            <div className="flex-1 pr-3">
                              <span className="font-mono font-medium text-warm-600 mr-2">{it.qty}×</span>
                              <span className="font-medium text-warm-800">{it.name}</span>
                              {it.notes && (
                                <p className="mt-0.5 text-xs text-amber-800 bg-amber-50 px-2 py-0.2 rounded border border-amber-200 inline-block font-normal">
                                  {it.notes}
                                </p>
                              )}
                            </div>
                            <span className="font-mono font-semibold text-warm-900">
                              {money(it.price * it.qty)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Special instructions if any */}
                      {o.notes && (
                        <div className="mt-2 rounded-xl bg-warm-50 p-2.5 text-xs text-warm-700 border border-warm-200">
                          <span className="font-semibold text-warm-900">Special Note:</span> {o.notes}
                        </div>
                      )}

                      {/* Round Subtotal */}
                      <div className="mt-3 flex justify-between border-t border-warm-100 pt-2 text-xs sm:text-sm font-medium">
                        <span className="text-warm-500">Round Total</span>
                        <span className="font-mono text-sm sm:text-base font-bold text-warm-900">{money(o.total)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 1. STICKY CART BAR (Refined typography & clear contrast) */}
      {cartTotalQty > 0 && tab === 'menu' && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-warm-200 bg-white/95 p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-floating backdrop-blur-md">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <div
              onClick={() => setShowCartDrawer(true)}
              className="flex-1 cursor-pointer flex items-center gap-3 min-w-0"
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-md">
                <Icons.Bag />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-warm-900 font-mono text-[10px] font-bold text-white ring-2 ring-white">
                  {cartTotalQty}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-warm-500 truncate">
                  {cartTotalQty} dish{cartTotalQty > 1 ? 'es' : ''} in table order
                </p>
                <p className="font-mono text-lg sm:text-xl font-bold text-warm-900 truncate">
                  {money(cartTotalPrice)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCartDrawer(true)}
              className="shrink-0 rounded-xl bg-brand px-4 py-2.5 font-display text-xs sm:text-sm font-semibold tracking-wide text-white uppercase shadow-md hover:bg-brand-dark active:scale-95 transition"
            >
              Review Order →
            </button>
          </div>
        </div>
      )}

      {/* 2. DISH CUSTOMIZATION MODAL (When tapping card) */}
      {activeItemModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-warm-950/60 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-in fade-in duration-200">
            {/* Modal Image Header */}
            <div className="relative aspect-[16/9] max-h-52 w-full bg-warm-100 overflow-hidden">
              {formatImageUrl(activeItemModal.image_url) ? (
                <img
                  src={formatImageUrl(activeItemModal.image_url)}
                  alt={activeItemModal.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-warm-100 text-warm-400">
                  <Icons.Utensils />
                </div>
              )}
              <button
                onClick={() => setActiveItemModal(null)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs hover:bg-black/80"
              >
                <Icons.Close />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-lg sm:text-xl font-bold text-warm-900">
                    {activeItemModal.name}
                  </h2>
                  <span className="font-mono text-base sm:text-lg font-semibold text-brand shrink-0">
                    {money(activeItemModal.price)}
                  </span>
                </div>
                {activeItemModal.description && (
                  <p className="mt-1 text-xs sm:text-sm text-warm-500 leading-relaxed">
                    {activeItemModal.description}
                  </p>
                )}
              </div>

              {/* Spice Level Option */}
              <div>
                <label className="block text-xs font-semibold text-warm-700 uppercase tracking-wider mb-1.5">
                  Spice Level Preference
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs sm:text-sm">
                  {['Default', 'Mild', 'Medium', 'Extra Hot'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setModalSpice(s)}
                      className={`rounded-xl py-2 font-medium transition ${
                        modalSpice === s
                          ? 'bg-warm-900 text-white shadow-xs'
                          : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Kitchen Notes */}
              <div>
                <label className="block text-xs font-semibold text-warm-700 uppercase tracking-wider mb-1">
                  Special Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. No onions, sauce on the side, allergies..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full rounded-xl border border-warm-300 bg-warm-50/70 p-2.5 text-xs sm:text-sm outline-none focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand font-normal"
                  maxLength={150}
                />
              </div>

              {/* Stepper & Confirm Button */}
              <div className="pt-1.5 flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 rounded-xl bg-warm-100 p-1">
                  <button
                    onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white font-mono text-sm font-semibold text-warm-800 shadow-xs active:scale-95"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-mono text-sm font-bold text-warm-900">
                    {modalQty}
                  </span>
                  <button
                    onClick={() => setModalQty(modalQty + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white shadow-xs active:scale-95"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={confirmCustomization}
                  className="flex-1 rounded-xl bg-brand py-3 font-display text-xs sm:text-sm font-semibold tracking-wide text-white uppercase shadow-md hover:bg-brand-dark active:scale-[0.98] transition truncate"
                >
                  Add to Order · {money(activeItemModal.price * modalQty)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CART DRAWER (Bottom Sheet) */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-warm-950/60 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-warm-100 px-5 py-3.5">
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-warm-900">
                  Review Table #{tableInfo?.table} Order
                </h2>
                <p className="text-xs text-warm-500 font-mono">
                  {cartTotalQty} item{cartTotalQty > 1 ? 's' : ''} in this round
                </p>
              </div>
              <button
                onClick={() => setShowCartDrawer(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-warm-100 text-warm-500 hover:bg-warm-200"
              >
                <Icons.Close />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {Object.entries(cart).map(([id, val]) => {
                const dish = menu.find((m) => m.id === Number(id))
                if (!dish) return null
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-warm-200 bg-warm-50/50 p-3.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm sm:text-base font-semibold text-warm-900 truncate">{dish.name}</p>
                      <p className="font-mono text-xs text-warm-500">{money(dish.price)} each</p>
                      {(val.spice || val.notes) && (
                        <p className="mt-0.5 text-xs text-amber-800 bg-amber-50 px-2 py-0.2 rounded inline-block border border-amber-200">
                          {val.spice} {val.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 shadow-xs border border-warm-200">
                        <button
                          onClick={() => adjustQty(dish.id, -1)}
                          className="h-5 w-5 font-bold text-warm-700 hover:text-warm-900 text-xs"
                        >
                          −
                        </button>
                        <span className="w-4 text-center font-mono text-xs font-semibold text-warm-900">{val.qty}</span>
                        <button
                          onClick={() => adjustQty(dish.id, 1)}
                          className="h-5 w-5 font-bold text-brand text-xs"
                        >
                          +
                        </button>
                      </div>

                      <span className="w-16 text-right font-mono text-xs sm:text-sm font-semibold text-warm-900">
                        {money(dish.price * val.qty)}
                      </span>
                    </div>
                  </div>
                )
              })}

              <div className="pt-1.5">
                <label className="block text-xs font-semibold text-warm-700 uppercase tracking-wider mb-1">
                  General Instructions for Kitchen (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Please bring water first, separate plates..."
                  value={orderLevelNote}
                  onChange={(e) => setOrderLevelNote(e.target.value)}
                  className="w-full rounded-xl border border-warm-300 bg-warm-50 p-2.5 text-xs sm:text-sm outline-none focus:border-brand focus:bg-white font-normal"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-warm-100 bg-white p-5 space-y-2.5">
              <div className="flex justify-between text-xs sm:text-sm text-warm-500 font-medium">
                <span>Round Subtotal</span>
                <span className="font-mono font-semibold text-warm-900 text-sm sm:text-base">{money(cartTotalPrice)}</span>
              </div>
              <div className="flex justify-between text-base sm:text-lg font-bold border-t border-warm-100 pt-2">
                <span>Total to Pay Later</span>
                <span className="font-mono text-brand text-lg sm:text-xl font-bold">{money(cartTotalPrice)}</span>
              </div>

              <button
                onClick={() => setShowConfirmModal(true)}
                className="w-full rounded-xl bg-brand py-3.5 font-display text-xs sm:text-sm font-semibold tracking-wide text-white uppercase shadow-md hover:bg-brand-dark active:scale-[0.98] transition"
              >
                Confirm &amp; Send to Kitchen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ORDER CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Icons.Utensils />
            </div>
            <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">
              Send Order to Kitchen?
            </h3>
            <p className="text-xs sm:text-sm text-warm-600 leading-relaxed">
              Your ticket containing <span className="font-semibold text-warm-900">{cartTotalQty} dish{cartTotalQty > 1 ? 'es' : ''}</span> ({money(cartTotalPrice)}) will be immediately printed and dispatched to the kitchen for Table #{tableInfo?.table}.
            </p>

            <div className="mt-3 flex flex-col gap-2 pt-1">
              <button
                onClick={submitOrder}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-brand py-3 font-display text-xs sm:text-sm font-semibold tracking-wide text-white uppercase shadow-md hover:bg-brand-dark disabled:opacity-50"
              >
                {isSubmitting ? 'Sending Ticket...' : 'Yes, Send Order to Kitchen ✓'}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-warm-100 py-2.5 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200"
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CALL STAFF MODAL */}
      {showCallStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-warm-100 pb-2.5">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">Table Assistance</h3>
                <p className="text-xs text-warm-500 font-mono">Table #{tableInfo?.table}</p>
              </div>
              <button
                onClick={() => setShowCallStaffModal(false)}
                className="text-warm-400 hover:text-warm-600"
              >
                <Icons.Close />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-warm-600">
              What can our floor team assist you with?
            </p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'waiter', label: '👋 Need Waiter' },
                { type: 'water', label: '💧 Refill Water' },
                { type: 'cutlery', label: '🍴 Extra Cutlery' },
                { type: 'bill', label: '🧾 Request Bill' },
              ].map((act) => (
                <button
                  key={act.type}
                  onClick={() => callStaff(act.type)}
                  className="rounded-2xl border border-warm-200 bg-warm-50/70 p-3 text-left text-xs sm:text-sm font-medium text-warm-800 hover:bg-warm-100 hover:border-warm-300 transition"
                >
                  {act.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCallStaffModal(false)}
              className="w-full rounded-xl bg-warm-100 py-2.5 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
