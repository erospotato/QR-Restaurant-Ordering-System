import React, { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Icons, ROLES } from './Icons'
import logo from '../assets/imgs/logo.jpg'

export default function StaffNavbar({
  me,
  onLogout,
  serviceCalls = [],
  onResolveService,
  soundEnabled = true,
  onToggleSound,
  badgeCounts = { orders: 0, lowStock: 0 },
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const [confirmModal, setConfirmModal] = useState(null) // null | 'switch' | 'exit'

  // Dismiss confirmation popup on Escape key press
  useEffect(() => {
    if (!confirmModal) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setConfirmModal(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [confirmModal])
  const role = ROLES[me?.role] || { title: me?.role || 'Staff', badge: 'bg-warm-100 text-warm-800 border-warm-200' }
  const isSuper = ['admin', 'owner'].includes(me?.role)
  const isManager = ['manager', 'admin', 'owner'].includes(me?.role)
  const isCashier = me?.role === 'cashier'
  const isKitchen = me?.role === 'kitchen'

  const navItems = useMemo(() => {
    const list = []
    if (isManager) {
      list.push({ id: 'dashboard', label: 'Overview', path: '/manager', icon: Icons.Dashboard })
      list.push({
        id: 'kds',
        label: `Kitchen KDS ${badgeCounts.orders > 0 ? `(${badgeCounts.orders})` : ''}`,
        path: '/kitchen',
        icon: Icons.Kitchen,
      })
      list.push({ id: 'cashier', label: 'Cashier POS', path: '/cashier', icon: Icons.Cashier })
      list.push({ id: 'members', label: 'VIP Members', path: '/members', icon: Icons.Star })
      list.push({ id: 'tables', label: 'Floor Tables', path: '/tables', icon: Icons.Table })
      list.push({ id: 'menu', label: 'Menu Catalog', path: '/menu', icon: Icons.Menu })
      list.push({
        id: 'stocks',
        label: `Inventory ${badgeCounts.lowStock > 0 ? `(${badgeCounts.lowStock} Low)` : ''}`,
        path: '/inventory',
        icon: Icons.Stock,
      })
      list.push({ id: 'qr', label: 'QR Generator', path: '/qr', icon: Icons.Qr })
      list.push({ id: 'users', label: 'Staff Roster', path: '/users', icon: Icons.Users })
    } else if (isCashier) {
      list.push({ id: 'cashier', label: 'Cashier POS', path: '/cashier', icon: Icons.Cashier })
      list.push({ id: 'members', label: 'VIP Members', path: '/members', icon: Icons.Star })
      list.push({ id: 'tables', label: 'Floor Tables', path: '/tables', icon: Icons.Table })
      list.push({ id: 'qr', label: 'QR Generator', path: '/qr', icon: Icons.Qr })
    } else if (isKitchen) {
      list.push({
        id: 'kds',
        label: `Kitchen KDS ${badgeCounts.orders > 0 ? `(${badgeCounts.orders})` : ''}`,
        path: '/kitchen',
        icon: Icons.Kitchen,
      })
      list.push({
        id: 'stocks',
        label: `Inventory ${badgeCounts.lowStock > 0 ? `(${badgeCounts.lowStock} Low)` : ''}`,
        path: '/inventory',
        icon: Icons.Stock,
      })
    }
    return list
  }, [isManager, isCashier, isKitchen, isSuper, badgeCounts.orders, badgeCounts.lowStock])

  return (
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
          {onResolveService && (
            <button
              onClick={() => onResolveService(serviceCalls[0].id)}
              className="shrink-0 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/30 hover:text-white active:bg-white/40 active:text-white transition"
            >
              Acknowledge ✓
            </button>
          )}
        </div>
      )}

      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2.5 sm:py-3">
        {/* Brand & Role Station */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 pr-2.5 sm:pr-4 border-r border-warm-200/80">
          <Link to="/staff" className="flex items-center gap-2.5 sm:gap-3 hover:opacity-90 transition">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-white border border-warm-200/90 p-1 shadow-xs overflow-hidden">
              <img src={logo} alt="MOLS MAISON" className="h-full w-full object-contain rounded-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-logo text-xl sm:text-2xl font-normal tracking-wide text-warm-900">MOLS MAISON</span>
                <span className={`rounded-md border px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase ${role.badge}`}>
                  {role.title}
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Real Route NavLinks with Smooth Scroll and Active Highlights */}
        <nav className="thin-scrollbar flex-1 min-w-0 mx-1 sm:mx-3 flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 px-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname === item.path
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition ${
                    isActive || active
                      ? 'bg-warm-900 text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white shadow-xs ring-1 ring-warm-900 font-semibold'
                      : 'text-warm-700 hover:bg-warm-100 hover:text-warm-950 active:bg-warm-200 active:text-warm-950'
                  }`
                }
              >
                {Icon && <Icon />}
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Controls: Audio Toggle, User, Switch Account, and Exit */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 pl-2 sm:pl-3 border-l border-warm-200/80">
          {onToggleSound && (
            <button
              type="button"
              onClick={onToggleSound}
              className="rounded-xl p-2 text-warm-600 hover:bg-warm-100 hover:text-warm-950 active:bg-warm-200 active:text-warm-950 transition"
              title={soundEnabled ? 'Chime sound enabled' : 'Chime sound muted'}
            >
              <Icons.Volume muted={!soundEnabled} />
            </button>
          )}

          <span className="hidden lg:inline font-mono text-xs font-semibold text-warm-700 bg-warm-100 px-2.5 py-1 rounded-lg">
            {me?.name}
          </span>

          <button
            type="button"
            onClick={() => setConfirmModal('switch')}
            className="rounded-xl border border-warm-300 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-medium text-warm-700 hover:bg-warm-100 hover:text-warm-950 hover:border-warm-400 active:bg-warm-200 transition shadow-xs cursor-pointer"
            title="Switch staff account"
          >
            Switch User
          </button>

          <button
            type="button"
            onClick={() => setConfirmModal('exit')}
            className="rounded-xl bg-warm-900 px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-warm-800 hover:text-white active:bg-warm-950 active:text-white transition shadow-xs cursor-pointer"
            title="End shift and log out"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Switching User or Exiting */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setConfirmModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-warm-200 text-left transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Brand Header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-warm-100">
              <div className="h-6 w-6 rounded-lg bg-white border border-warm-200 p-0.5 overflow-hidden shadow-xs">
                <img src={logo} alt="MOLS MAISON" className="h-full w-full object-contain rounded-md" />
              </div>
              <span className="font-logo text-xs font-semibold tracking-wider text-warm-700 uppercase">
                MOLS MAISON Station Security
              </span>
            </div>

            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setConfirmModal(null)}
              className="absolute top-4 right-4 rounded-xl p-1.5 text-warm-400 hover:bg-warm-100 hover:text-warm-700 transition"
              title="Close modal"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {confirmModal === 'switch' ? (
              <>
                {/* Switch User Confirmation Dialog */}
                <div className="flex items-start gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/90 shadow-xs">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 pr-6">
                    <h3 className="font-display text-lg font-bold text-warm-900">
                      Switch Staff Account?
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-warm-600 leading-relaxed">
                      Are you sure you want to switch to another staff profile? You will be redirected to the sign-in screen to select or enter another account.
                    </p>
                  </div>
                </div>

                {/* Current Staff Card */}
                <div className="mt-4 rounded-2xl bg-warm-50 border border-warm-200/90 p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">Currently Active</span>
                    <p className="font-display font-bold text-warm-900 text-sm">{me?.name || 'Staff User'}</p>
                    <p className="text-xs text-warm-500 font-mono">{me?.email || ''}</p>
                  </div>
                  <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${role.badge}`}>
                    {role.title}
                  </span>
                </div>

                <div className="mt-3 text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="text-sm">⚠️</span>
                  <span>Unsaved table drafts or pending order entries on this terminal may be reset.</span>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfirmModal(null)}
                    className="w-full sm:w-auto rounded-xl border border-warm-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-warm-700 hover:bg-warm-100 hover:text-warm-900 transition shadow-xs"
                  >
                    Cancel / Stay Here
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal(null)
                      navigate('/login')
                    }}
                    className="w-full sm:w-auto rounded-xl bg-warm-900 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-warm-800 active:bg-warm-950 transition shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Yes, Switch User</span>
                    <span>→</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Exit Session Confirmation Dialog */}
                <div className="flex items-start gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/90 shadow-xs">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 pr-6">
                    <h3 className="font-display text-lg font-bold text-warm-900">
                      Exit &amp; End Shift?
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-warm-600 leading-relaxed">
                      Are you sure you want to end your shift and log out of this terminal?
                    </p>
                  </div>
                </div>

                {/* Current Staff Card */}
                <div className="mt-4 rounded-2xl bg-warm-50 border border-warm-200/90 p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">Signing Out</span>
                    <p className="font-display font-bold text-warm-900 text-sm">{me?.name || 'Staff User'}</p>
                    <p className="text-xs text-warm-500 font-mono">{me?.email || ''}</p>
                  </div>
                  <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${role.badge}`}>
                    {role.title}
                  </span>
                </div>

                <div className="mt-3 text-[11px] text-warm-600 bg-warm-100/70 border border-warm-200 rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="text-sm">ℹ️</span>
                  <span>You will be logged out immediately and returned to the login screen.</span>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfirmModal(null)}
                    className="w-full sm:w-auto rounded-xl border border-warm-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-warm-700 hover:bg-warm-100 hover:text-warm-900 transition shadow-xs"
                  >
                    Cancel / Keep Working
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal(null)
                      if (onLogout) onLogout()
                    }}
                    className="w-full sm:w-auto rounded-xl bg-rose-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-rose-700 active:bg-rose-800 transition shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Yes, Exit &amp; Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
