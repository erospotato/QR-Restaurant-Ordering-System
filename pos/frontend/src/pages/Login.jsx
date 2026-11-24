import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, inp } from '../lib'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/imgs/logo.jpg'

export default function Login() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [form, setForm] = useState({ email: 'owner@mail.com', password: 'password123' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const presets = [
    { label: 'Owner', email: 'owner@mail.com', role: 'owner' },
    { label: 'Manager', email: 'manager@mail.com', role: 'manager' },
    { label: 'Cashier', email: 'cashier@mail.com', role: 'cashier' },
    { label: 'Kitchen (KDS)', email: 'kitchen@mail.com', role: 'kitchen' },
    { label: 'Admin', email: 'admin@mail.com', role: 'admin' },
  ]

  const redirectByRole = (role) => {
    if (role === 'kitchen') navigate('/kitchen', { replace: true })
    else if (role === 'cashier') navigate('/cashier', { replace: true })
    else navigate('/manager', { replace: true })
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const res = await api('/login', { method: 'POST', body: form })
      login(res.user, res.token)
      redirectByRole(res.user.role)
    } catch (err) {
      setErr(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const handlePreset = (p) => {
    setForm({ email: p.email, password: 'password123' })
  }

  return (
    <div className="grid min-h-screen place-items-center bg-warm-100/70 p-4 font-sans text-warm-900">
      <div className="w-full max-w-md rounded-3xl border border-warm-200/90 bg-white p-8 shadow-card">
        {/* Brand Header */}
        <div className="text-center pb-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white border border-warm-200/90 p-2 shadow-soft overflow-hidden">
            <img src={logo} alt="MOLS MAISON" className="h-full w-full object-contain rounded-2xl" />
          </div>
          <h1 className="mt-3 font-logo text-2xl sm:text-3xl font-normal tracking-wide text-warm-900">
            MOLS MAISON
          </h1>
          <p className="mt-1 text-xs text-warm-500 font-medium">
            Staff Portal &amp; Kitchen Management System
          </p>
        </div>

        {/* Quick Role Switcher Presets */}
        <div className="mt-5 mb-6">
          <p className="mb-2 text-center text-[11px] font-semibold tracking-wider text-warm-400 uppercase">
            Quick Station Logins
          </p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {presets.map((p) => {
              const active = form.email === p.email
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className={`rounded-xl px-2 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-warm-900 text-white shadow-xs'
                      : 'bg-warm-100/80 text-warm-700 hover:bg-warm-200/80 hover:text-warm-950'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Error message */}
        {err && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">
            {err}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-warm-800 uppercase tracking-wide">
              Staff Email
            </label>
            <input
              type="email"
              required
              className={`mt-1.5 w-full ${inp}`}
              placeholder="e.g. cashier@mail.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-warm-800 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              required
              className={`mt-1.5 w-full ${inp}`}
              placeholder="Enter password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-warm-900 py-3 font-display text-sm font-semibold text-white shadow-md hover:bg-brand hover:text-white active:bg-brand-dark active:text-white transition duration-150 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Station →'}
          </button>
        </form>
      </div>
    </div>
  )
}
