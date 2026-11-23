import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import './index.css'
import { api } from './lib'
import Customer from './pages/Customer'
import Staff from './pages/Staff'

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
            className="mt-4 rounded-xl bg-warm-900 px-4 py-2 text-xs font-semibold text-white shadow-xs"
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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warm-900 text-brand-300 animate-pulse">
          <span className="font-logo text-xl">MR</span>
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
    <Routes>
      <Route path="/t/:token" element={<Customer />} />
      <Route path="/scan/:tableNumber" element={<ScanRedirect />} />
      <Route path="/table/:tableNumber" element={<ScanRedirect />} />
      <Route path="/staff" element={<Staff />} />
      <Route path="*" element={<Navigate to="/staff" replace />} />
    </Routes>
  </BrowserRouter>
)
