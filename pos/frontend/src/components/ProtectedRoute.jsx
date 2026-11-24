import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/imgs/logo.jpg'

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-warm-50 font-sans">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white border border-warm-200/90 p-2 shadow-soft overflow-hidden animate-pulse">
            <img src={logo} alt="MOLS MAISON" className="h-full w-full object-contain rounded-2xl" />
          </div>
          <div className="mt-4 h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent mx-auto" />
          <p className="mt-2 text-xs font-mono text-warm-500">Connecting to station...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Universal access for admin and owner
  const isSuper = ['admin', 'owner'].includes(user.role)
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role) && !isSuper) {
    // If unauthorized, redirect to their role-appropriate page
    if (user.role === 'kitchen') {
      return <Navigate to="/kitchen" replace />
    }
    if (user.role === 'cashier') {
      return <Navigate to="/cashier" replace />
    }
    return <Navigate to="/manager" replace />
  }

  return children
}
