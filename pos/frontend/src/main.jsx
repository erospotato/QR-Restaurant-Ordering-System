import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import './index.css'
import { api } from './lib'
import { AuthProvider } from './context/AuthContext'
import { DialogProvider } from './context/DialogContext'
import ProtectedRoute from './components/ProtectedRoute'
import StaffLayout from './components/StaffLayout'
import Customer from './pages/Customer'
import Staff from './pages/Staff'
import Login from './pages/Login'
import Kitchen from './pages/Kitchen'
import Cashier from './pages/Cashier'
import Manager from './pages/Manager'
import TablePage from './pages/TablePage'
import MenuPage from './pages/MenuPage'
import InventoryPage from './pages/InventoryPage'
import QrPage from './pages/QrPage'
import UsersPage from './pages/UsersPage'
import MembersPage from './pages/MembersPage'
import logo from './assets/imgs/logo.jpg'

function ScanRedirect() {
  const { tableNumber } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function resolveTable() {
      try {
        const res = await api(`/tables/scan/${tableNumber}`)
        if (!cancelled && res?.token) {
          navigate(`/t/${res.token}`, { replace: true })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Table not found or inactive')
        }
      }
    }
    resolveTable()
    return () => {
      cancelled = true
    }
  }, [tableNumber, navigate])

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-warm-100 p-6 text-center font-sans">
        <div className="max-w-sm rounded-3xl bg-white p-8 shadow-card border border-warm-200">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-warm-900">Table QR Inactive</h2>
          <p className="mt-2 text-xs sm:text-sm text-warm-600 leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark active:bg-brand-900 shadow-xs transition"
          >
            Retry Scan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen place-items-center bg-warm-100 p-6 text-center font-sans">
      <div className="max-w-sm rounded-3xl bg-white p-8 shadow-card border border-warm-200">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white border border-warm-200/90 p-2 shadow-xs overflow-hidden animate-pulse">
          <img src={logo} alt="MOLS MAISON" className="h-full w-full object-contain rounded-2xl" />
        </div>
        <h2 className="mt-4 font-display text-lg font-bold text-warm-900">Connecting to Table #{tableNumber}...</h2>
        <p className="mt-1 text-xs text-warm-500 font-mono">Opening fresh dining session</p>
        <div className="mt-4 h-1.5 w-full bg-warm-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand animate-pulse w-3/4 rounded-full" />
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <DialogProvider>
      <AuthProvider>
      <Routes>
        {/* Customer Dining Experience */}
        <Route path="/t/:token" element={<Customer />} />
        <Route path="/scan/:tableNumber" element={<ScanRedirect />} />
        <Route path="/table/:tableNumber" element={<ScanRedirect />} />

        {/* Public Login Route (Always accessible, presets for all roles) */}
        <Route path="/login" element={<Login />} />

        {/* Staff Layout: Shared Navbar, Chime Audio, Service Alerts & Data Outlet */}
        <Route element={<StaffLayout />}>
          <Route
            path="/manager"
            element={
              <ProtectedRoute allowedRoles={['manager', 'owner', 'admin']}>
                <Manager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['manager', 'owner', 'admin']}>
                <Manager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['manager', 'owner', 'admin']}>
                <Manager />
              </ProtectedRoute>
            }
          />

          <Route
            path="/kitchen"
            element={
              <ProtectedRoute allowedRoles={['kitchen', 'manager', 'owner', 'admin']}>
                <Kitchen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kds"
            element={
              <ProtectedRoute allowedRoles={['kitchen', 'manager', 'owner', 'admin']}>
                <Kitchen />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cashier"
            element={
              <ProtectedRoute allowedRoles={['cashier', 'manager', 'owner', 'admin']}>
                <Cashier />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos"
            element={
              <ProtectedRoute allowedRoles={['cashier', 'manager', 'owner', 'admin']}>
                <Cashier />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tables"
            element={
              <ProtectedRoute allowedRoles={['cashier', 'manager', 'owner', 'admin']}>
                <TablePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/menu"
            element={
              <ProtectedRoute allowedRoles={['manager', 'owner', 'admin']}>
                <MenuPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute allowedRoles={['kitchen', 'manager', 'owner', 'admin']}>
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stocks"
            element={
              <ProtectedRoute allowedRoles={['kitchen', 'manager', 'owner', 'admin']}>
                <InventoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/qr"
            element={
              <ProtectedRoute allowedRoles={['cashier', 'manager', 'owner', 'admin']}>
                <QrPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['manager', 'owner', 'admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />

          {/* VIP Customers & Membership Directory (Owner, Manager, Admin, Cashier) */}
          <Route
            path="/members"
            element={
              <ProtectedRoute allowedRoles={['cashier', 'manager', 'owner', 'admin']}>
                <MembersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vip"
            element={
              <ProtectedRoute allowedRoles={['cashier', 'manager', 'owner', 'admin']}>
                <MembersPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Staff Hub Entry Point */}
        <Route path="/staff" element={<Staff />} />
        <Route path="/" element={<Staff />} />
        <Route path="*" element={<Navigate to="/staff" replace />} />
      </Routes>
    </AuthProvider>
  </DialogProvider>
</BrowserRouter>
)
