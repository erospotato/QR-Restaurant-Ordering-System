import React, { useCallback, useEffect, useRef, useState } from 'react'
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

  const soundEnabledRef = useRef(soundEnabled)
  soundEnabledRef.current = soundEnabled

  const alertsInitializedRef = useRef(false)
  const knownOrderIdsRef = useRef(new Set())
  const knownServiceCallIdsRef = useRef(new Set())
  const knownStockAlertIdsRef = useRef(new Set())

  useEffect(() => {
    alertsInitializedRef.current = false
    knownOrderIdsRef.current = new Set()
    knownServiceCallIdsRef.current = new Set()
    knownStockAlertIdsRef.current = new Set()
  }, [user?.id])

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

      const nextOrders = Array.isArray(o) ? o : []
      const nextCalls = Array.isArray(sc) ? sc : []
      const nextStock =
        ing && typeof ing === 'object' && Array.isArray(ing.ingredients)
          ? ing
          : { ingredients: [], alerts: [], low_count: 0 }
      const nextStockAlerts = Array.isArray(nextStock.alerts) ? nextStock.alerts : []

      if (alertsInitializedRef.current && soundEnabledRef.current) {
        const hasNewOrder = nextOrders.some(
          (ord) => ord.status === 'new' && !knownOrderIdsRef.current.has(ord.id)
        )
        const hasNewServiceCall = nextCalls.some(
          (call) => !knownServiceCallIdsRef.current.has(call.id)
        )
        const hasNewStockAlert = nextStockAlerts.some(
          (alert) => !knownStockAlertIdsRef.current.has(alert.id)
        )
        if (hasNewOrder || hasNewServiceCall || hasNewStockAlert) {
          playChime('ticket')
        }
      }

      knownOrderIdsRef.current = new Set(nextOrders.map((ord) => ord.id))
      knownServiceCallIdsRef.current = new Set(nextCalls.map((call) => call.id))
      knownStockAlertIdsRef.current = new Set(nextStockAlerts.map((alert) => alert.id))
      alertsInitializedRef.current = true

      setOrders(nextOrders)
      setTables(Array.isArray(t) ? t : [])
      setServiceCalls(nextCalls)
      setStockData(nextStock)
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

  useLive(Boolean(user), refreshAll)

  const resolveService = async (id) => {
    try {
      await api(`/staff/service-calls/${id}/resolve`, { method: 'PATCH' })
      refreshAll()
    } catch (err) {
      console.warn('Failed to resolve service call:', err)
    }
  }

  const toggleSound = () => {
    setSoundEnabled((prev) => !prev)
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
