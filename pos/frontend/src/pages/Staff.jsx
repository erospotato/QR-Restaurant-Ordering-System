import { useCallback, useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ago, api, formatImageUrl, getToken, inp, money, playChime, setToken, timeStr, useLive } from '../lib'

// Professional Line SVG Icons
const Icons = {
  Dashboard: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Kitchen: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  Cashier: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Table: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  Menu: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Stock: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Qr: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  ),
  Users: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Bell: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Print: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  ),
  Check: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  Volume: ({ muted }) => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      {muted ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      )}
    </svg>
  ),
}

const ROLES = {
  admin: { title: 'System Admin', badge: 'bg-purple-100 text-purple-900 border-purple-200' },
  owner: { title: 'Owner', badge: 'bg-rose-100 text-rose-900 border-rose-200' },
  manager: { title: 'Floor Manager', badge: 'bg-sky-100 text-sky-900 border-sky-200' },
  cashier: { title: 'Cashier', badge: 'bg-amber-100 text-amber-900 border-amber-200' },
  kitchen: { title: 'Chef (KDS)', badge: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
}

export default function Staff() {
  const [me, setMe] = useState(undefined)

  useEffect(() => {
    if (!getToken()) return setMe(null)
    api('/me')
      .then(setMe)
      .catch(() => {
        setToken(null)
        setMe(null)
      })
  }, [])

  const logout = () => {
    api('/logout', { method: 'POST' }).catch(() => {})
    setToken(null)
    setMe(null)
  }

  if (me === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-warm-50">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-brand border-t-transparent" />
      </div>
    )
  }

  return me ? <Dashboard me={me} onLogout={logout} /> : <Login onDone={setMe} />
}

// -------------------------------------------------------------
// 1. REFINED STAFF LOGIN (Larger Inputs & Labels)
// -------------------------------------------------------------
function Login({ onDone }) {
  const [form, setForm] = useState({ email: 'owner@mail.com', password: 'password123' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const presets = [
    { label: 'Owner', email: 'owner@mail.com' },
    { label: 'Manager', email: 'manager@mail.com' },
    { label: 'Cashier', email: 'cashier@mail.com' },
    { label: 'Kitchen (KDS)', email: 'kitchen@mail.com' },
    { label: 'Admin', email: 'admin@mail.com' },
  ]

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const res = await api('/login', { method: 'POST', body: form })
      setToken(res.token)
      onDone(res.user)
    } catch (err) {
      setErr(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-warm-100/70 p-4 font-sans text-warm-900">
      <div className="w-full max-w-md rounded-3xl border border-warm-200/90 bg-white p-8 shadow-card">
        {/* Brand Header */}
        <div className="text-center pb-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warm-900 text-white shadow-soft">
            <span className="font-logo text-lg text-brand-300">MR</span>
          </div>
          <h1 className="mt-3 font-logo text-2xl sm:text-3xl font-normal tracking-wide text-warm-900">
            Mols Resto <span className="font-display text-xs uppercase tracking-wider font-bold text-brand px-1.5 py-0.5 rounded bg-brand-50 border border-brand-200 ml-1">POS</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-warm-500 mt-0.5">Hospitality Management Terminal</p>
        </div>

        {err && (
          <div className="mt-3.5 rounded-xl bg-rose-50 p-3 text-xs sm:text-sm font-medium text-rose-700 border border-rose-200">
            {err}
          </div>
        )}

        {/* Quick Demo Role Selector with Refined Typography */}
        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-warm-500 block mb-1.5">
            Quick Sign-In Switcher:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.email}
                type="button"
                onClick={() => setForm({ email: p.email, password: 'password123' })}
                className={`rounded-xl px-2.5 py-1 text-xs font-medium transition ${
                  form.email === p.email
                    ? 'bg-warm-900 text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white shadow-xs font-semibold'
                    : 'bg-warm-100 text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">Staff Email</label>
            <input
              type="email"
              required
              className={inp + ' w-full font-mono text-sm'}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">Password</label>
            <input
              type="password"
              required
              className={inp + ' w-full font-mono text-sm'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand py-3 font-display text-xs sm:text-sm font-semibold tracking-wide text-white uppercase shadow-md hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Station'}
          </button>
        </form>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// 2. DASHBOARD CONTAINER WITH HIGH CONTRAST TABS & HEADERS
// -------------------------------------------------------------
function Dashboard({ me, onLogout }) {
  const isSuper = ['admin', 'owner'].includes(me.role)
  const isManager = me.role === 'manager' || isSuper
  const isCashier = me.role === 'cashier' || isManager
  const isKitchen = me.role === 'kitchen'

  const [activeTab, setActiveTab] = useState(
    isKitchen ? 'kds' : isCashier && !isManager ? 'cashier' : 'dashboard'
  )

  const [orders, setOrders] = useState([])
  const [tables, setTables] = useState([])
  const [menu, setMenu] = useState([])
  const [sales, setSales] = useState(null)
  const [stockData, setStockData] = useState({ ingredients: [], alerts: [], low_count: 0 })
  const [serviceCalls, setServiceCalls] = useState([])

  const [soundEnabled, setSoundEnabled] = useState(true)

  const refreshAll = useCallback(async () => {
    try {
      const calls = [
        api('/staff/orders'),
        api('/staff/tables'),
        api('/staff/service-calls'),
      ]
      if (isKitchen || isManager) {
        calls.push(api('/staff/ingredients'))
      }
      const [o, t, sc, s] = await Promise.all(calls)
      setOrders(o || [])
      setTables(t || [])
      setServiceCalls(sc || [])
      if (isKitchen || isManager) {
        setStockData(s || { ingredients: [], alerts: [], low_count: 0 })
      } else {
        setStockData({ ingredients: [], alerts: [], low_count: 0 })
      }

      if (isManager) {
        const [m, sl] = await Promise.all([api('/staff/menu'), api('/staff/sales')])
        setMenu(m || [])
        setSales(sl || null)
      }
    } catch (e) {
      console.error(e)
    }
  }, [isKitchen, isManager])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  useLive(true, () => {
    refreshAll()
    if (soundEnabled) playChime('ticket')
  })

  const resolveService = async (id) => {
    await api(`/staff/service-calls/${id}/resolve`, { method: 'PATCH' })
    refreshAll()
  }

  const navItems = useMemo(() => {
    const list = []
    if (isManager) list.push({ id: 'dashboard', label: 'Overview', icon: Icons.Dashboard })
    if (isKitchen || isManager)
      list.push({
        id: 'kds',
        label: `Kitchen KDS ${orders.length > 0 ? `(${orders.length})` : ''}`,
        icon: Icons.Kitchen,
      })
    if (isCashier) list.push({ id: 'cashier', label: 'Cashier POS', icon: Icons.Cashier })
    if (isManager || isCashier) list.push({ id: 'tables', label: 'Floor Tables', icon: Icons.Table })
    if (isManager) list.push({ id: 'menu', label: 'Menu Catalog', icon: Icons.Menu })
    if (isKitchen || isManager) {
      list.push({
        id: 'stocks',
        label: `Inventory ${stockData.low_count > 0 ? `(${stockData.low_count} Low)` : ''}`,
        icon: Icons.Stock,
      })
    }
    if (isManager) list.push({ id: 'qr', label: 'QR Generator', icon: Icons.Qr })
    if (isSuper) list.push({ id: 'users', label: 'Staff Roster', icon: Icons.Users })
    return list
  }, [isManager, isKitchen, isCashier, isSuper, orders.length, stockData.low_count])

  const role = ROLES[me.role] || { title: me.role, badge: 'bg-warm-100' }

  return (
    <div className="min-h-screen bg-warm-100/50 font-sans text-warm-900 pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-warm-200/90 bg-white shadow-soft print:hidden">
        {/* Service Calls Live Marquee / Alert Ribbon */}
        {serviceCalls.length > 0 && (
          <div className="bg-amber-500 px-4 py-1.5 text-xs sm:text-sm font-medium text-white flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2 truncate flex-1 min-w-0">
              <Icons.Bell />
              <span className="truncate">
                TABLE ASSISTANCE: Table #{serviceCalls[0].table_number} needs {serviceCalls[0].type.toUpperCase()}
                {serviceCalls[0].notes ? ` (${serviceCalls[0].notes})` : ''}
              </span>
            </div>
            <button
              onClick={() => resolveService(serviceCalls[0].id)}
              className="shrink-0 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/30 hover:text-white active:bg-white/40 active:text-white transition"
            >
              Acknowledge ✓
            </button>
          </div>
        )}

        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          {/* Brand & Role Station */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-warm-900 text-white shadow-xs">
              <span className="font-logo text-sm text-brand-300">MR</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-logo text-xl font-normal tracking-wide text-warm-900">Mols Resto</span>
                <span className={`rounded-md border px-2 py-0.2 text-[11px] font-medium ${role.badge}`}>
                  {role.title}
                </span>
              </div>
            </div>
          </div>

          {/* Nav Links with Refined Font and Horizontal Scroll */}
          <nav className="no-scrollbar flex-1 min-w-0 mx-2 sm:mx-4 flex gap-1 overflow-x-auto py-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs sm:text-sm font-medium transition ${
                    active
                      ? 'bg-warm-900 text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white shadow-xs ring-1 ring-warm-900 font-semibold'
                      : 'text-warm-700 hover:bg-warm-100 hover:text-warm-950 active:bg-warm-200 active:text-warm-950'
                  }`}
                >
                  <Icon />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Sound & Logout */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled)
                if (!soundEnabled) playChime('ticket')
              }}
              className="rounded-xl p-2 text-warm-600 hover:bg-warm-100 hover:text-warm-950 active:bg-warm-200 active:text-warm-950 transition"
              title={soundEnabled ? 'Chime sound enabled' : 'Chime sound muted'}
            >
              <Icons.Volume muted={!soundEnabled} />
            </button>

            <span className="hidden md:inline font-mono text-xs font-medium text-warm-600">
              {me.name}
            </span>

            <button
              onClick={onLogout}
              className="rounded-xl border border-warm-300 px-3 py-1 text-xs sm:text-sm font-medium text-warm-800 hover:bg-warm-100 hover:text-warm-950 hover:border-warm-400 active:bg-warm-200 active:text-warm-950 transition"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Screens */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        {activeTab === 'dashboard' && isManager && (
          <SalesDashboard sales={sales} orders={orders} tables={tables} reload={refreshAll} />
        )}

        {activeTab === 'kds' && (
          <KitchenDisplay orders={orders} reload={refreshAll} />
        )}

        {activeTab === 'cashier' && (
          <CashierBilling
            orders={orders}
            tables={tables}
            reload={refreshAll}
            cashierName={me.name}
          />
        )}

        {activeTab === 'tables' && (isManager || isCashier) && (
          <TableManagement tables={tables} reload={refreshAll} isManager={isManager} />
        )}

        {activeTab === 'menu' && isManager && (
          <MenuCatalog menu={menu} reload={refreshAll} />
        )}

        {activeTab === 'stocks' && (isKitchen || isManager) && (
          <InventoryManagement
            data={stockData}
            reload={refreshAll}
            canManage={isManager}
            userName={me.name}
          />
        )}

        {activeTab === 'qr' && isManager && (
          <QrPrintStation tables={tables} reload={refreshAll} />
        )}

        {activeTab === 'users' && isSuper && (
          <StaffRoster currentUserId={me.id} reload={refreshAll} />
        )}
      </main>
    </div>
  )
}

// -------------------------------------------------------------
// 3. KITCHEN DISPLAY SYSTEM (Larger Typography & High-Contrast Cards)
// -------------------------------------------------------------
function KitchenDisplay({ orders, reload }) {
  const [struckItems, setStruckItems] = useState({})
  const [filterCat, setFilterCat] = useState('all')

  const toggleItemStrike = (key) => {
    setStruckItems((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const advance = async (orderId, status) => {
    await api(`/orders/${orderId}`, { method: 'PATCH', body: { status } })
    reload()
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
                    ? 'bg-warm-900 text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white shadow-xs font-semibold'
                    : 'text-warm-600 hover:text-warm-950 hover:bg-warm-200/70 active:bg-warm-300 active:text-warm-950'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={reload}
            className="rounded-xl bg-warm-900 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* 3 Columns Kanban */}
      <div className="grid gap-3.5 md:grid-cols-3">
        {stages.map((stg) => {
          const list = orders.filter((o) => o.status === stg.id)
          return (
            <div key={stg.id} className="flex flex-col rounded-3xl bg-warm-200/50 p-3">
              <div className="mb-3 flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${stg.color}`} />
                  <span className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-warm-900">
                    {stg.title}
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-warm-800 rounded-full bg-white px-2 py-0.2 shadow-xs">
                  {list.length}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto max-h-[75vh]">
                {list.map((ticket) => {
                  const minutesAgo = Math.floor((Date.now() - ticket.ts) / 60000)
                  const isUrgent = minutesAgo > 15
                  return (
                    <div
                      key={ticket.id}
                      className={`flex flex-col justify-between rounded-2xl bg-white p-4 shadow-card border transition ${
                        isUrgent ? 'border-rose-400 ring-2 ring-rose-200' : 'border-warm-200'
                      }`}
                    >
                      {/* Ticket Header */}
                      <div className="flex items-center justify-between border-b border-warm-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-base font-bold text-warm-900">
                            Table #{ticket.table}
                          </span>
                          {ticket.addon && (
                            <span className="rounded bg-purple-50 px-1.5 py-0.2 text-[10px] font-medium text-purple-700 border border-purple-200">
                              Round 2+
                            </span>
                          )}
                        </div>
                        <span
                          className={`font-mono text-xs font-medium px-2 py-0.5 rounded-md ${
                            isUrgent ? 'bg-rose-100 text-rose-800 font-bold' : 'bg-warm-100 text-warm-800'
                          }`}
                        >
                          {ago(ticket.ts)}
                        </span>
                      </div>

                      {/* Dishes Checklist */}
                      <div className="my-2.5 space-y-1.5">
                        {ticket.items.map((it, idx) => {
                          const key = `${ticket.id}_${idx}`
                          const isStruck = !!struckItems[key]
                          return (
                            <div
                              key={idx}
                              onClick={() => toggleItemStrike(key)}
                              className={`cursor-pointer rounded-xl p-2 transition border ${
                                isStruck
                                  ? 'bg-warm-50 border-warm-200 line-through opacity-50'
                                  : 'bg-warm-50/50 border-warm-200 hover:bg-warm-100/70'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs sm:text-sm">
                                <span className="font-medium text-warm-900">
                                  <span className="inline-block w-7 font-mono text-brand font-semibold">
                                    {it.qty}×
                                  </span>
                                  {it.name}
                                </span>
                                <span className="font-mono text-[10px] font-semibold text-warm-500">
                                  {isStruck ? 'DONE' : 'PLATING'}
                                </span>
                              </div>
                              {it.notes && (
                                <p className="mt-0.5 ml-7 text-xs font-medium text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 inline-block">
                                  {it.notes}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Ticket notes */}
                      {ticket.notes && (
                        <div className="mb-2.5 rounded-xl bg-sky-50 border border-sky-200 p-2 text-xs text-sky-950">
                          <span className="font-semibold">Instructions:</span> {ticket.notes}
                        </div>
                      )}

                      {/* Advance Button */}
                      <button
                        onClick={() => advance(ticket.id, stg.next)}
                        className="w-full rounded-xl bg-warm-900 py-2.5 font-display text-xs sm:text-sm font-semibold tracking-wide text-white uppercase shadow-xs hover:bg-brand hover:text-white active:bg-brand-dark active:text-white active:scale-[0.98] transition"
                      >
                        {stg.btn} →
                      </button>
                    </div>
                  )
                })}

                {list.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-warm-300 bg-white/50 p-10 text-center text-sm font-mono text-warm-400">
                    No active tickets in this stage
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// 4. CASHIER POS (Table Cards with Clear High-Contrast Highlight)
// -------------------------------------------------------------
function CashierBilling({ orders, tables, reload, cashierName }) {
  const [selectedTable, setSelectedTable] = useState(null)
  const [paymentMode, setPaymentMode] = useState('cash')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [splitCount, setSplitCount] = useState(1)
  const [cashTendered, setCashTendered] = useState('')
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showMerge, setShowMerge] = useState(false)
  const [mergeSrc, setMergeSrc] = useState('')
  const [mergeTgt, setMergeTgt] = useState('')

  const activeOrders = useMemo(() => {
    if (!selectedTable) return []
    return orders.filter((o) => o.table === selectedTable)
  }, [orders, selectedTable])

  const aggregated = useMemo(() => {
    const map = {}
    activeOrders.forEach((o) => {
      o.items.forEach((it) => {
        if (!map[it.name]) map[it.name] = { name: it.name, price: it.price, qty: 0 }
        map[it.name].qty += it.qty
      })
    })
    return Object.values(map)
  }, [activeOrders])

  const subtotal = useMemo(() => {
    return activeOrders.reduce((sum, o) => sum + o.total, 0)
  }, [activeOrders])

  const discountAmount = useMemo(() => {
    return (subtotal * discountPercent) / 100
  }, [subtotal, discountPercent])

  const finalTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount)
  }, [subtotal, discountAmount])

  const splitShare = useMemo(() => {
    return splitCount > 1 ? finalTotal / splitCount : finalTotal
  }, [finalTotal, splitCount])

  const changeDue = useMemo(() => {
    const tendered = parseFloat(cashTendered) || 0
    return tendered >= finalTotal ? tendered - finalTotal : 0
  }, [cashTendered, finalTotal])

  const handlePay = async () => {
    if (!selectedTable || processing) return
    setProcessing(true)
    try {
      await api(`/tables/${selectedTable}/pay`, {
        method: 'POST',
        body: { payment_method: paymentMode },
      })
      alert(`Table #${selectedTable} settled and cleared successfully!`)
      setSelectedTable(null)
      setShowReceiptModal(false)
      setCashTendered('')
      setDiscountPercent(0)
      reload()
    } catch (e) {
      alert(e.message || 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warm-200 bg-white p-4 sm:p-5 shadow-card">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-warm-900">
            Cashier Check-out Station
          </h2>
          <p className="text-xs text-warm-500 font-mono mt-0.5">
            Table billing · Split calculation · Receipt generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs sm:text-sm font-medium text-warm-800 bg-warm-100 rounded-xl px-3 py-1.5">
            Active: {tables.filter((t) => t.status === 'occupied').length} / {tables.length} Tables
          </span>
          <button
            onClick={() => {
              setMergeSrc(selectedTable ? String(selectedTable) : '')
              setMergeTgt('')
              setShowMerge(true)
            }}
            className="rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-purple-900 hover:bg-purple-100 hover:text-purple-950 active:bg-purple-200 active:text-purple-950 transition"
          >
            Merge Tables
          </button>
          <button
            onClick={reload}
            className="rounded-xl bg-warm-900 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white transition"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Table Map (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-2.5">
          <span className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-warm-600 block">
            Floor Map (Select Table)
          </span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {tables.map((t) => {
              const isOccupied = t.status === 'occupied' || t.order_count > 0
              const isSelected = selectedTable === t.number
              return (
                <button
                  key={t.number}
                  onClick={() => setSelectedTable(t.number)}
                  className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition ${
                    isSelected
                      ? 'border-brand bg-brand/10 ring-2 ring-brand/40 shadow-card text-warm-950'
                      : isOccupied
                      ? 'border-amber-300 bg-amber-50/70 hover:bg-amber-100/70 shadow-card'
                      : 'border-warm-200 bg-white hover:bg-warm-50 shadow-soft'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-display text-base font-bold text-warm-900">
                        Table #{t.number}
                      </span>
                      <p className="text-xs font-mono text-warm-500">{t.capacity} seats</p>
                    </div>
                    <span
                      className={`rounded-md px-1.5 py-0.2 font-mono text-[10px] font-semibold ${
                        isSelected
                          ? 'bg-brand text-white'
                          : isOccupied
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-warm-100 text-warm-600'
                      }`}
                    >
                      {isSelected ? 'SELECTED' : isOccupied ? 'OCCUPIED' : 'FREE'}
                    </span>
                  </div>

                  {t.merged_with && (
                    <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                      <span>Linked to #{t.merged_with}</span>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (confirm(`Unmerge Table #${t.number}?`)) {
                            try {
                              await api('/staff/tables/unmerge', {
                                method: 'POST',
                                body: { number: t.number },
                              })
                              reload()
                            } catch (err) {
                              alert(err.message || 'Failed to unmerge')
                            }
                          }
                        }}
                        className="text-rose-600 hover:text-rose-800 underline ml-1 font-semibold"
                      >
                        Unmerge
                      </button>
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-warm-200/60 flex items-center justify-between">
                    <span className="text-xs text-warm-500 font-medium">Balance</span>
                    <span className={`font-mono text-sm sm:text-base font-semibold ${isOccupied ? 'text-amber-900' : 'text-warm-400'}`}>
                      {money(t.unpaid_total)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Checkout Panel (Right 1 col with High Contrast) */}
        <div className="rounded-3xl border border-warm-200 bg-white p-5 shadow-card lg:sticky lg:top-20 h-fit space-y-3.5">
          {!selectedTable ? (
            <div className="py-10 text-center text-warm-400">
              <span className="text-3xl">🧾</span>
              <p className="mt-2 font-display text-base font-semibold text-warm-800">No Table Selected</p>
              <p className="text-xs sm:text-sm text-warm-500">Select an occupied table from the floor map.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-warm-100 pb-3">
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">
                    Table #{selectedTable} Settle Bill
                  </h3>
                  <p className="text-xs font-mono text-warm-500 mt-0.5">
                    {activeOrders.length} ticket round{activeOrders.length > 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="rounded-lg p-1.5 text-warm-400 hover:bg-warm-100 text-xs"
                >
                  ✕
                </button>
              </div>

              {(() => {
                const curTable = tables.find((t) => t.number === selectedTable)
                if (curTable?.merged_with) {
                  return (
                    <div className="flex items-center justify-between rounded-xl bg-purple-50 p-2.5 text-xs font-medium text-purple-900 border border-purple-200">
                      <span>Merged into Table #{curTable.merged_with}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await api('/staff/tables/unmerge', {
                              method: 'POST',
                              body: { number: selectedTable },
                            })
                            alert(`Table #${selectedTable} unmerged successfully!`)
                            reload()
                          } catch (e) {
                            alert(e.message || 'Failed to unmerge')
                          }
                        }}
                        className="rounded-lg bg-rose-600 px-2.5 py-1 text-white font-semibold text-xs hover:bg-rose-700 active:bg-rose-800 transition"
                      >
                        Unmerge Table
                      </button>
                    </div>
                  )
                }
                return null
              })()}

              {aggregated.length === 0 ? (
                <p className="py-6 text-center text-xs sm:text-sm text-warm-400">No active bill for this table.</p>
              ) : (
                <>
                  {/* Itemized summary */}
                  <div className="max-h-52 overflow-y-auto space-y-1.5 divide-y divide-warm-100 pr-1">
                    {aggregated.map((it, idx) => (
                      <div key={idx} className="flex justify-between pt-1.5 text-xs sm:text-sm">
                        <span className="font-medium text-warm-800">
                          <span className="w-5 inline-block font-mono text-warm-950 font-semibold">{it.qty}×</span> {it.name}
                        </span>
                        <span className="font-mono font-semibold text-warm-900">
                          {money(it.price * it.qty)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Discount / Promo buttons */}
                  <div className="pt-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-warm-600 mb-1">
                      Apply Discount
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 text-xs">
                      {[0, 5, 10, 15].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDiscountPercent(d)}
                          className={`rounded-xl py-1.5 font-mono font-medium transition ${
                            discountPercent === d
                              ? 'bg-warm-900 text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white shadow-xs font-semibold'
                              : 'bg-warm-100 text-warm-800 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950'
                          }`}
                        >
                          {d === 0 ? 'None' : `${d}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Split Bill Calculator */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-warm-600 mb-1">
                      <span>Split Check</span>
                      {splitCount > 1 && (
                        <span className="text-brand font-mono font-semibold text-xs sm:text-sm">
                          {money(splitShare)} / person
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-xs">
                      {[1, 2, 3, 4].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setSplitCount(n)}
                          className={`rounded-xl py-1.5 font-mono font-medium transition ${
                            splitCount === n
                              ? 'bg-warm-900 text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white shadow-xs font-semibold'
                              : 'bg-warm-100 text-warm-800 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950'
                          }`}
                        >
                          {n === 1 ? '1 Pay' : `${n} Ways`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Totals Breakdown */}
                  <div className="border-t border-warm-200 pt-2.5 space-y-1 text-xs sm:text-sm">
                    <div className="flex justify-between text-warm-600 font-medium">
                      <span>Subtotal</span>
                      <span className="font-mono text-warm-900 font-semibold">{money(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Discount ({discountPercent}%)</span>
                        <span className="font-mono">-{money(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base sm:text-lg font-bold text-warm-900 pt-1 border-t border-warm-100">
                      <span>Total Due</span>
                      <span className="font-mono text-brand text-lg sm:text-xl font-bold">{money(finalTotal)}</span>
                    </div>
                  </div>

                  {/* Payment Mode Selector */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {[
                      { id: 'cash', label: 'Cash' },
                      { id: 'card', label: 'Card' },
                      { id: 'qr', label: 'QR Pay' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMode(m.id)}
                        className={`rounded-xl py-2 font-display text-xs sm:text-sm font-medium transition ${
                          paymentMode === m.id
                            ? 'bg-warm-900 text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white shadow-xs font-semibold'
                            : 'bg-warm-100 text-warm-800 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Cash Change Tender Calculator */}
                  {paymentMode === 'cash' && (
                    <div className="rounded-2xl bg-warm-50 p-2.5 border border-warm-200 space-y-2">
                      <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-warm-800">
                        <span>Cash Tendered ($):</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          className="w-24 rounded-xl border border-warm-300 p-1 font-mono text-right text-xs sm:text-sm font-semibold outline-none focus:border-brand"
                        />
                      </div>
                      {parseFloat(cashTendered) > 0 && (
                        <div className="flex items-center justify-between font-mono text-xs sm:text-sm font-semibold text-emerald-700 pt-1 border-t border-warm-200">
                          <span>Change Due:</span>
                          <span className="text-sm sm:text-base">{money(changeDue)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1.5">
                    <button
                      onClick={() => setShowReceiptModal(true)}
                      className="flex items-center justify-center gap-1.5 flex-1 rounded-xl border border-warm-300 py-2.5 text-xs sm:text-sm font-medium text-warm-800 hover:bg-warm-100 hover:text-warm-950 hover:border-warm-400 active:bg-warm-200 active:text-warm-950 transition"
                    >
                      <Icons.Print />
                      <span>Receipt</span>
                    </button>

                    <button
                      onClick={handlePay}
                      disabled={processing}
                      className="flex-1 rounded-xl bg-emerald-600 py-2.5 font-display text-xs sm:text-sm font-semibold tracking-wide text-white uppercase shadow-md hover:bg-emerald-700 hover:text-white active:bg-emerald-800 active:text-white active:scale-95 transition disabled:opacity-50"
                    >
                      {processing ? 'Clearing...' : 'Settle & Close'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Printable Thermal Receipt Modal */}
      {showReceiptModal && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div id="printable-receipt" className="font-mono text-xs text-black space-y-2.5">
              <div className="text-center pb-2.5 border-b border-dashed border-black">
                <h3 className="font-logo text-xl tracking-wider">MOLS RESTO</h3>
                <p className="text-[11px]">123 Culinary Row · Tel: 555-0199</p>
                <p className="text-[11px]">Table #{selectedTable} · Server: {cashierName}</p>
                <p className="text-[10px]">{new Date().toLocaleString()}</p>
              </div>

              <div className="py-2.5 space-y-1.5 border-b border-dashed border-black">
                {aggregated.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span>{item.qty}x {item.name}</span>
                    <span>{money(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pt-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{money(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount ({discountPercent}%):</span>
                    <span>-{money(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1.5 border-t border-dashed border-black">
                  <span>TOTAL:</span>
                  <span>{money(finalTotal)}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span>Payment:</span>
                  <span className="uppercase">{paymentMode} (PAID)</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-black text-[10px]">
                <p>Thank you for choosing Mols Resto!</p>
                <p>Wifi: MolsGuest / Pass: freshfood</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2 print-hide">
              <button
                onClick={() => window.print()}
                className="flex-1 rounded-xl bg-warm-900 py-3.5 font-display text-xs sm:text-sm font-bold text-white shadow-md hover:bg-brand hover:text-white active:bg-brand-dark active:text-white transition"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="rounded-xl border border-warm-300 px-4 py-3.5 text-xs sm:text-sm font-bold text-warm-700 hover:bg-warm-100 hover:text-warm-950 hover:border-warm-400 active:bg-warm-200 active:text-warm-950 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Merge Modal for Cashier */}
      {showMerge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                await api('/staff/tables/merge', {
                  method: 'POST',
                  body: { source_number: Number(mergeSrc), target_number: Number(mergeTgt) },
                })
                setShowMerge(false)
                alert(`Table #${mergeSrc} merged into Table #${mergeTgt}!`)
                reload()
              } catch (err) {
                alert(err.message || 'Failed to merge tables')
              }
            }}
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-3.5"
          >
            <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">Merge Two Tables</h3>
            <p className="text-xs text-warm-500">Combine orders from source table into target master table.</p>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">Source Table to Merge</label>
              <select
                required
                className={inp + ' w-full font-mono text-sm'}
                value={mergeSrc}
                onChange={(e) => setMergeSrc(e.target.value)}
              >
                <option value="">Select source table</option>
                {tables.map((t) => (
                  <option key={t.number} value={t.number}>Table #{t.number} ({t.status})</option>
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
                <option value="">Select target table</option>
                {tables
                  .filter((t) => String(t.number) !== String(mergeSrc))
                  .map((t) => (
                    <option key={t.number} value={t.number}>Table #{t.number} ({t.status})</option>
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
                className="flex-1 rounded-xl bg-purple-600 py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-purple-700 hover:text-white active:bg-purple-800 active:text-white transition"
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

// -------------------------------------------------------------
// 5. TABLE MANAGEMENT (Add / Move / Merge / Unmerge)
// -------------------------------------------------------------
function TableManagement({ tables, reload, isManager }) {
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
    if (confirm(`Remove Table #${num}?`)) {
      try {
        await api(`/staff/tables/${num}`, { method: 'DELETE' })
        reload()
      } catch (e) {
        alert(e.message || 'Cannot delete table')
      }
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

// -------------------------------------------------------------
// 6. MENU CATALOG (Refined Typography & Balanced Modals)
// -------------------------------------------------------------
function MenuCatalog({ menu, reload }) {
  const [editingItem, setEditingItem] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sortBy, setSortBy] = useState('name')

  const categories = useMemo(() => {
    return [...new Set(menu.map((m) => m.category).filter(Boolean))]
  }, [menu])

  const filtered = useMemo(() => {
    const list = menu.filter((m) => {
      const matchSearch =
        !search.trim() ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(search.toLowerCase()))
      const matchCat = category === 'all' || m.category === category
      return matchSearch && matchCat
    })

    if (sortBy === 'price_asc') return list.sort((a, b) => a.price - b.price)
    if (sortBy === 'price_desc') return list.sort((a, b) => b.price - a.price)
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [menu, search, category, sortBy])

  const toggleAvailable = (item) => {
    api(`/menu/${item.id}`, { method: 'PATCH', body: { is_available: !item.is_available } }).then(reload)
  }

  const deleteItem = (item) => {
    if (confirm(`Remove "${item.name}" from restaurant menu?`)) {
      api(`/menu/${item.id}`, { method: 'DELETE' }).then(reload)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warm-200 bg-white p-4 sm:p-5 shadow-card">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-warm-900">
            Restaurant Menu Catalog
          </h2>
          <p className="text-xs text-warm-500 font-mono mt-0.5">
            {menu.length} total recipes · Real-time price and availability control
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-xl bg-brand px-3.5 py-1.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white active:scale-95 transition"
        >
          + Add New Dish
        </button>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-warm-200 bg-white p-3 shadow-soft">
        <input
          type="text"
          placeholder="Filter menu items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inp + ' flex-1 min-w-[180px] text-xs sm:text-sm'}
        />

        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inp + ' text-xs sm:text-sm'}>
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={inp + ' text-xs sm:text-sm'}>
          <option value="name">Sort A to Z</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {/* Grid of Menu Items with Clean Text */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => {
          const img = formatImageUrl(item.image_url)
          return (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-warm-200 bg-white p-3.5 shadow-card"
            >
              <div className="flex gap-3">
                <div className="relative h-16 w-16 shrink-0 rounded-2xl bg-warm-100 overflow-hidden border border-warm-200">
                  {img ? (
                    <img src={img} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-warm-400">
                      <Icons.Kitchen />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-display text-sm sm:text-base font-semibold text-warm-900 truncate">{item.name}</span>
                    {item.is_top_sale && (
                      <span className="rounded bg-rose-50 px-1.5 py-0.2 text-[10px] font-medium text-rose-700 border border-rose-200">
                        Top
                      </span>
                    )}
                    {item.is_signature && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-medium text-amber-800 border border-amber-200">
                        Chef
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs sm:text-sm font-medium text-warm-600 mt-0.5">
                    {item.category} · {money(item.price)}
                  </p>
                  {item.description && (
                    <p className="text-xs text-warm-500 line-clamp-1 mt-0.5">{item.description}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-warm-100 flex items-center justify-between">
                <button
                  onClick={() => toggleAvailable(item)}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    item.is_available ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-warm-100 text-warm-500 line-through'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${item.is_available ? 'bg-emerald-600' : 'bg-warm-400'}`} />
                  {item.is_available ? 'Available' : 'Sold Out'}
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="text-xs font-medium text-warm-700 hover:text-brand"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteItem(item)}
                    className="text-xs font-medium text-rose-600 hover:text-rose-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {(showAdd || editingItem) && (
        <DishFormModal
          item={editingItem}
          existingCategories={categories}
          onClose={() => {
            setShowAdd(false)
            setEditingItem(null)
          }}
          onSaved={() => {
            setShowAdd(false)
            setEditingItem(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function DishFormModal({ item, onClose, onSaved, existingCategories = [] }) {
  const [name, setName] = useState(item?.name || '')
  const [price, setPrice] = useState(item?.price || '')
  const [description, setDescription] = useState(item?.description || '')
  const [isTopSale, setIsTopSale] = useState(item?.is_top_sale || false)
  const [isSignature, setIsSignature] = useState(item?.is_signature || false)
  const [imageUrl, setImageUrl] = useState(item?.image_url || '')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)

  // Merge unique categories with fallback standards
  const allCategories = useMemo(() => {
    const defaults = ['Mains', 'Starters', 'Desserts', 'Drinks', 'Sides']
    const combined = [...new Set([...(existingCategories || []), ...defaults])]
    return combined.filter(Boolean)
  }, [existingCategories])

  const initialCat = item?.category || allCategories[0] || 'Mains'
  const isInitialPreset = allCategories.includes(initialCat)

  const [categoryMode, setCategoryMode] = useState(item && !isInitialPreset ? 'new' : 'select')
  const [selectedCategory, setSelectedCategory] = useState(isInitialPreset ? initialCat : allCategories[0] || 'Mains')
  const [newCategory, setNewCategory] = useState(item && !isInitialPreset ? item.category : '')

  const previewUrl = useMemo(() => {
    if (file) return URL.createObjectURL(file)
    if (imageUrl) return formatImageUrl(imageUrl)
    return null
  }, [file, imageUrl])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const finalCategory = categoryMode === 'new' ? newCategory.trim() : selectedCategory
    if (!finalCategory) {
      alert('Please select or specify a category for this dish.')
      return
    }

    setBusy(true)
    const fd = new FormData()
    fd.append('name', name)
    fd.append('price', price)
    fd.append('category', finalCategory)
    fd.append('description', description)
    fd.append('is_top_sale', isTopSale ? '1' : '0')
    fd.append('is_signature', isSignature ? '1' : '0')

    if (file) fd.append('image', file)
    else if (imageUrl) fd.append('image_url', imageUrl)

    try {
      if (item) {
        await api(`/menu/${item.id}`, { method: 'PATCH', form: fd })
      } else {
        await api('/menu', { method: 'POST', form: fd })
      }
      onSaved()
    } catch (err) {
      alert(err.message || 'Failed to save dish')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/60 p-4 backdrop-blur-xs">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-warm-100 pb-3">
          <h3 className="font-display text-base sm:text-lg font-bold text-warm-900">
            {item ? `Edit Dish: ${item.name}` : 'Add New Menu Dish'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-warm-400 hover:bg-warm-100 hover:text-warm-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Dish Name & Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">
              Dish Name *
            </label>
            <input
              required
              placeholder="e.g. Truffle Wagyu Burger"
              className={inp + ' w-full text-xs sm:text-sm'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">
              Price ($) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="18.50"
              className={inp + ' w-full text-xs sm:text-sm font-mono'}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        {/* Dynamic Category Selector: Pick Existing or Add New */}
        <div className="rounded-2xl border border-warm-200 bg-warm-50/70 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-semibold text-warm-800">
              Category *
            </label>
            <div className="flex items-center gap-1 rounded-xl bg-warm-200/70 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setCategoryMode('select')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  categoryMode === 'select'
                    ? 'bg-warm-900 text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white shadow-xs font-semibold'
                    : 'text-warm-600 hover:text-warm-950 hover:bg-warm-100 active:bg-warm-200 active:text-warm-950'
                }`}
              >
                Existing Categories
              </button>
              <button
                type="button"
                onClick={() => setCategoryMode('new')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  categoryMode === 'new'
                    ? 'bg-warm-900 text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white shadow-xs font-semibold'
                    : 'text-warm-600 hover:text-warm-950 hover:bg-warm-100 active:bg-warm-200 active:text-warm-950'
                }`}
              >
                + Add New
              </button>
            </div>
          </div>

          {categoryMode === 'select' ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setCategoryMode('new')
                    } else {
                      setSelectedCategory(e.target.value)
                    }
                  }}
                  className={inp + ' flex-1 text-xs sm:text-sm py-2'}
                >
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__add_new__">+ Add new category...</option>
                </select>
              </div>

              {/* Touch-friendly category quick chips */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {allCategories.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      selectedCategory === c
                        ? 'bg-warm-900 text-white shadow-xs'
                        : 'bg-white text-warm-700 border border-warm-200 hover:bg-warm-100'
                    }`}
                  >
                    {c}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCategoryMode('new')}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium border border-dashed border-warm-400 text-warm-700 hover:bg-warm-100"
                >
                  + New Category
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="Type new category (e.g. Pasta, Tapas, Chef's Specials, Breakfast)..."
                required={categoryMode === 'new'}
                className={inp + ' w-full text-xs sm:text-sm'}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                autoFocus
              />
              <div className="flex items-center justify-between text-[11px] text-warm-500">
                <span>Will instantly create this category and appear on customer & staff menus.</span>
                <button
                  type="button"
                  onClick={() => setCategoryMode('select')}
                  className="text-brand font-medium hover:underline shrink-0 ml-2"
                >
                  Choose existing
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-warm-700 mb-1">
            Description
          </label>
          <textarea
            rows={2}
            placeholder="Ingredients, culinary preparation, allergen highlights..."
            className={inp + ' w-full text-xs sm:text-sm font-normal'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Photo Upload & Preview */}
        <div className="rounded-2xl border border-warm-200 bg-warm-50/70 p-3.5 space-y-2">
          <label className="block text-xs sm:text-sm font-semibold text-warm-800">
            Dish Photo (Upload File or Enter URL)
          </label>
          <div className="flex items-center gap-3">
            {previewUrl ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-warm-300 bg-warm-100 shadow-xs">
                <img
                  src={previewUrl}
                  alt="Dish preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-warm-300 bg-warm-100/50 text-warm-400 text-xs text-center p-1 font-medium">
                No Photo
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-1.5">
              <input
                type="file"
                accept="image/*"
                className="block w-full text-xs text-warm-700 file:mr-2 file:rounded-lg file:border-0 file:bg-warm-200 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-warm-800 hover:file:bg-warm-300 cursor-pointer"
                onChange={(e) => setFile(e.target.files[0] || null)}
              />
              <input
                type="url"
                placeholder="Or paste image URL (https://...)"
                className={inp + ' w-full text-xs font-mono py-1'}
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Badges / Highlights */}
        <div className="flex flex-wrap gap-2.5 pt-1">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-rose-800 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 cursor-pointer select-none hover:bg-rose-100 transition">
            <input
              type="checkbox"
              checked={isTopSale}
              onChange={(e) => setIsTopSale(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500"
            />
            🔥 Top Seller
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 cursor-pointer select-none hover:bg-amber-100 transition">
            <input
              type="checkbox"
              checked={isSignature}
              onChange={(e) => setIsSignature(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            ⭐ Chef's Signature
          </label>
        </div>

        {/* Actions */}
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
            className="flex-1 rounded-xl bg-brand py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white transition disabled:opacity-50"
          >
            {busy ? 'Saving Recipe...' : item ? 'Update Recipe' : 'Add Dish to Menu'}
          </button>
        </div>
      </form>
    </div>
  )
}

// -------------------------------------------------------------
// 7. INVENTORY MANAGEMENT (Enterprise Restaurant Suite)
// -------------------------------------------------------------
function InventoryManagement({ data, reload, canManage, userName }) {
  const { ingredients = [], alerts = [] } = data
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
    if (!confirm(`Are you sure you want to permanently delete "${ing.name}" from inventory?`)) return
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
      `PURCHASE REORDER SHEET - MOLS RESTO`,
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
                  ? 'bg-warm-900 text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white shadow-xs font-semibold'
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
            className="rounded-xl bg-warm-900 px-3 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white transition"
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
            className="flex-1 rounded-xl bg-warm-900 py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white transition"
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
                    ? 'bg-warm-900 text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white font-semibold'
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
                  ? 'bg-warm-900 text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white font-semibold'
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
                className="flex-1 rounded-xl bg-warm-900 py-2.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white transition flex items-center justify-center gap-1.5"
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

// -------------------------------------------------------------
// 8. SALES DASHBOARD & CSV REPORT EXPORT (Refined Analytics)
// -------------------------------------------------------------
function SalesDashboard({ sales, reload }) {
  if (!sales) return null

  const exportCSV = () => {
    const rows = [
      ['Report Type', 'Mols Resto Performance Audit'],
      ['Export Date', new Date().toISOString()],
      ['Today Sales', sales.today],
      ['Week Sales', sales.week],
      ['Month Sales', sales.month],
      ['All Time Sales', sales.total],
      ['Total Orders', sales.all_orders],
      [''],
      ['Top Selling Dish', 'Units Sold', 'Revenue'],
      ...sales.top_dishes.map((d) => [d.name, d.qty, d.revenue]),
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `mols_sales_report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warm-200 bg-white p-4 sm:p-5 shadow-card">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-warm-900">
            Executive Performance &amp; Revenue Analytics
          </h2>
          <p className="text-xs text-warm-500 font-mono mt-0.5">
            Daily turnover · Kitchen volume · Category share
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="rounded-xl border border-warm-300 bg-warm-50 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-warm-800 hover:bg-warm-100 hover:text-warm-950 hover:border-warm-400 active:bg-warm-200 active:text-warm-950 transition"
          >
            Export CSV
          </button>
          <button
            onClick={reload}
            className="rounded-xl bg-warm-900 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats with Refined Numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-card">
          <span className="text-xs font-medium uppercase tracking-wider text-warm-500">Today Sales</span>
          <p className="font-mono text-2xl sm:text-3xl font-bold text-emerald-600 mt-0.5">{money(sales.today)}</p>
          <p className="font-mono text-xs font-medium text-warm-400 mt-0.5">{sales.today_orders} orders settled</p>
        </div>

        <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-card">
          <span className="text-xs font-medium uppercase tracking-wider text-warm-500">This Week</span>
          <p className="font-mono text-2xl sm:text-3xl font-bold text-warm-900 mt-0.5">{money(sales.week)}</p>
        </div>

        <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-card">
          <span className="text-xs font-medium uppercase tracking-wider text-warm-500">This Month</span>
          <p className="font-mono text-2xl sm:text-3xl font-bold text-warm-900 mt-0.5">{money(sales.month)}</p>
        </div>

        <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-card">
          <span className="text-xs font-medium uppercase tracking-wider text-warm-500">Lifetime Gross</span>
          <p className="font-mono text-2xl sm:text-3xl font-bold text-brand mt-0.5">{money(sales.total)}</p>
          <p className="font-mono text-xs font-medium text-warm-400 mt-0.5">{sales.all_orders} total tickets</p>
        </div>
      </div>

      {/* Leaderboard & Recent Orders */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-warm-200 bg-white p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between border-b border-warm-100 pb-2.5">
            <h3 className="font-display text-sm sm:text-base font-bold text-warm-900">Top Selling Recipes (Leaderboard)</h3>
            <span className="font-mono text-xs text-warm-500 font-medium">By volume</span>
          </div>

          <div className="space-y-2">
            {sales.top_dishes.map((d, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl bg-warm-50 p-2.5 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-warm-200 font-mono text-xs font-bold text-warm-800">
                    #{idx + 1}
                  </span>
                  <span className="font-medium text-warm-900">{d.name}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-semibold text-warm-900 mr-2.5">{d.qty} sold</span>
                  <span className="font-medium text-emerald-700">{money(d.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-warm-200 bg-white p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between border-b border-warm-100 pb-2.5">
            <h3 className="font-display text-sm sm:text-base font-bold text-warm-900">Recent Settled Checks</h3>
            <span className="font-mono text-xs text-warm-500 font-medium">Last 20 tickets</span>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {sales.recent_orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-warm-100 bg-warm-50/50 p-2.5 text-xs sm:text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-warm-900">Table #{o.table}</span>
                    <span className="rounded bg-warm-200 px-1.5 py-0.2 font-mono text-[10px] font-semibold uppercase text-warm-800">
                      {o.payment_method}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-warm-500 mt-0.5">
                    {timeStr(o.ts)} · {o.items_count} items
                  </p>
                </div>
                <span className="font-mono font-bold text-sm sm:text-base text-warm-900">{money(o.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// 9. QR CODE STATION
// -------------------------------------------------------------
function QrPrintStation({ tables, reload }) {
  const base = import.meta.env.VITE_PUBLIC_URL || location.origin

  const rotate = async (num) => {
    if (confirm(`Regenerate secret QR token for Table #${num}?`)) {
      await api(`/tables/${num}/rotate`, { method: 'POST' })
      reload()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-warm-200 bg-white p-4 sm:p-5 shadow-card print:hidden">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-warm-900">Table QR Placards</h2>
          <p className="text-xs text-warm-500 font-mono mt-0.5">Display on tabletops for guest ordering</p>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-warm-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white transition"
        >
          Print Placards
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3">
        {tables.map((t) => (
          <div
            key={t.number}
            className="rounded-3xl border border-warm-200 bg-white p-5 text-center shadow-card flex flex-col items-center justify-between break-inside-avoid"
          >
            <QRCodeSVG
              value={`${base}/scan/${t.number}`}
              size={140}
              className="p-2 bg-white rounded-xl shadow-xs"
            />
            <div className="mt-3">
              <span className="font-display text-lg font-bold text-warm-900">Table #{t.number}</span>
              <p className="text-xs font-mono text-warm-500 mt-0.5">Scan to view menu &amp; order</p>
            </div>
            <div className="mt-2.5 flex items-center justify-center gap-2 print:hidden">
              <a
                href={`${base}/scan/${t.number}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-brand hover:underline font-medium"
                title="Preview table ordering experience"
              >
                Open Table ↗
              </a>
              <span className="text-warm-300">·</span>
              <button
                onClick={() => rotate(t.number)}
                className="font-mono text-xs text-warm-500 hover:text-warm-900 underline"
              >
                Rotate Token
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// 10. STAFF ROSTER (ADMIN & OWNER)
// -------------------------------------------------------------
function StaffRoster({ currentUserId, reload }) {
  const [users, setUsers] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'kitchen' })

  const load = useCallback(async () => {
    const list = await api('/staff/users')
    setUsers(list || [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleAdd = async (e) => {
    e.preventDefault()
    await api('/staff/users', { method: 'POST', body: form })
    setShowAdd(false)
    setForm({ name: '', email: '', password: '', role: 'kitchen' })
    load()
    reload()
  }

  const handleDelete = async (u) => {
    if (u.id === currentUserId) return alert('Cannot delete active account')
    if (confirm(`Remove access for ${u.name}?`)) {
      await api(`/staff/users/${u.id}`, { method: 'DELETE' })
      load()
      reload()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-warm-200 bg-white p-4 sm:p-5 shadow-card">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-warm-900">Staff Credentials Roster</h2>
          <p className="text-xs text-warm-500 font-mono mt-0.5">Role permissions and terminal accounts</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-xl bg-brand px-3.5 py-1.5 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white active:scale-95 transition"
        >
          + Add Staff
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-3xl border border-warm-200 bg-white p-5 shadow-card space-y-3.5">
          <h3 className="font-display text-sm sm:text-base font-semibold text-warm-900">Provision Staff Account</h3>
          <div className="grid gap-2.5 sm:grid-cols-4">
            <input
              required
              placeholder="Name"
              className={inp + ' text-xs sm:text-sm'}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              type="email"
              required
              placeholder="Email"
              className={inp + ' text-xs sm:text-sm font-mono'}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              type="password"
              required
              placeholder="Password"
              className={inp + ' text-xs sm:text-sm font-mono'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inp + ' text-xs sm:text-sm font-medium'}
            >
              <option value="kitchen">Kitchen Staff</option>
              <option value="cashier">Cashier</option>
              <option value="manager">Floor Manager</option>
              <option value="owner">Restaurant Owner</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1.5">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-xl bg-warm-100 px-3.5 py-2 text-xs sm:text-sm font-medium text-warm-700 hover:bg-warm-200 hover:text-warm-950 active:bg-warm-300 active:text-warm-950 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-brand px-4 py-2 font-display text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-dark hover:text-white active:bg-brand-900 active:text-white transition"
            >
              Create Account
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-warm-100 rounded-3xl border border-warm-200 bg-white shadow-card">
        {users.map((u) => {
          const r = ROLES[u.role] || { title: u.role, badge: 'bg-warm-100' }
          return (
            <div key={u.id} className="flex items-center justify-between p-4 text-xs sm:text-sm">
              <div>
                <p className="font-display font-semibold text-warm-900 text-sm sm:text-base">{u.name}</p>
                <p className="font-mono text-warm-500 mt-0.5">{u.email}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className={`rounded-md border px-2.5 py-0.5 text-xs font-medium ${r.badge}`}>
                  {r.title}
                </span>
                {u.id !== currentUserId && (
                  <button onClick={() => handleDelete(u)} className="text-xs font-medium text-warm-400 hover:text-rose-600">
                    Delete
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
