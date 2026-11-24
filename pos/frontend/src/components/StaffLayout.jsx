import React, { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { api, playChime, useLive } from '../lib'
import { useAuth } from '../context/AuthContext'
import StaffNavbar from './StaffNavbar'
import ErrorBoundary from './ErrorBoundary'

export default function StaffLayout() {
  const { user, logout } = useAuth()
  const [orders, setOrders] = useState([])
  const [tables, setTables] = useState([])
  const [menu, setMenu] = useState([])
  const [sales, setSales] = useState(null)
  const [stockData, setStockData] = useState({ ingredients: [], alerts: [], low_count: 0 })
  const [serviceCalls, setServiceCalls] = useState([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)

  const isSuper = ['admin', 'owner'].includes(user?.role)
  const isManager = ['manager', 'admin', 'owner'].includes(user?.role)
  const isKitchen = user?.role === 'kitchen' || isManager
  const isCashier = user?.role === 'cashier' || isManager

  const refreshAll = useCallback(async () => {
    if (!user) return

    // Concurrently fetch each endpoint with its own safe fallback
    const fetchers = [
      api('/staff/orders').catch((err) => {
        console.warn('Could not fetch orders:', err.message)
        return []
      }),
      api('/staff/tables').catch((err) => {
        console.warn('Could not fetch tables:', err.message)
        return []
      }),
      api('/staff/service-calls').catch((err) => {
        console.warn('Could not fetch service calls:', err.message)
        return []
      }),
      isKitchen
        ? api('/staff/ingredients').catch((err) => {
            console.warn('Could not fetch ingredients:', err.message)
            return { ingredients: [], alerts: [], low_count: 0 }
          })
        : Promise.resolve({ ingredients: [], alerts: [], low_count: 0 }),
      isCashier
        ? api('/staff/menu').catch((err) => {
            console.warn('Could not fetch menu:', err.message)
            return []
          })
        : Promise.resolve([]),
      isManager
        ? api('/staff/sales').catch((err) => {
            console.warn('Could not fetch sales:', err.message)
            return null
          })
        : Promise.resolve(null),
    ]

    try {
      const [o, t, sc, ing, m, s] = await Promise.all(fetchers)

      setOrders(Array.isArray(o) ? o : [])
      setTables(Array.isArray(t) ? t : [])
      setServiceCalls(Array.isArray(sc) ? sc : [])
      setStockData(
        ing && typeof ing === 'object' && Array.isArray(ing.ingredients)
          ? ing
          : { ingredients: [], alerts: [], low_count: 0 }
      )
      setMenu(Array.isArray(m) ? m : [])
      if (s) setSales(s)
    } catch (e) {
      console.error('Error in refreshAll:', e)
    } finally {
      setDataLoading(false)
    }
  }, [user, isKitchen, isCashier, isManager])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  useLive(Boolean(user), () => {
    refreshAll()
    if (soundEnabled) playChime('ticket')
  })

  const resolveService = async (id) => {
    try {
      await api(`/staff/service-calls/${id}/resolve`, { method: 'PATCH' })
      refreshAll()
    } catch (err) {
      console.warn('Failed to resolve service call:', err)
    }
  }

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev
      if (next) playChime('ticket')
      return next
    })
  }

  return (
    <div className="min-h-screen bg-warm-100/50 font-sans text-warm-900 pb-20">
      <StaffNavbar
        me={user}
        onLogout={logout}
        serviceCalls={serviceCalls}
        onResolveService={resolveService}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        badgeCounts={{
          orders: (orders || []).length,
          lowStock: stockData?.low_count || 0,
        }}
      />

      <main className="mx-auto max-w-[1440px] p-4 sm:p-6">
        <ErrorBoundary onRetry={refreshAll}>
          <Outlet
            context={{
              orders: orders || [],
              tables: tables || [],
              menu: menu || [],
              sales,
              stockData: stockData || { ingredients: [], alerts: [], low_count: 0 },
              serviceCalls: serviceCalls || [],
              dataLoading,
              refreshAll,
              isManager,
              isSuper,
              isCashier,
              isKitchen,
              cashierName: user?.name,
            }}
          />
        </ErrorBoundary>
      </main>
    </div>
  )
}
