import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, getToken, setToken } from '../lib'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    const t = getToken()
    if (!t) {
      setUser(null)
      setLoading(false)
      return null
    }
    try {
      const u = await api('/me')
      setUser(u)
      setLoading(false)
      return u
    } catch {
      setToken(null)
      setUser(null)
      setLoading(false)
      return null
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = (newUser, token) => {
    if (token) setToken(token)
    setUser(newUser)
  }

  const logout = async () => {
    try {
      await api('/logout', { method: 'POST' })
    } catch {
      // Ignore network errors on logout
    }
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, checkAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
