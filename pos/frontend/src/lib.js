import { useEffect, useRef } from 'react'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
window.Pusher = Pusher

const TK = 'pos_token'
export const getToken = () => localStorage.getItem(TK)
export const setToken = (t) => (t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK))
export const money = (n) => '$' + Number(n || 0).toFixed(2)

export const ago = (t) => {
  if (!t) return ''
  const m = Math.floor((Date.now() - t) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m ago`
}

export const timeStr = (ts) => {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Sophisticated, clean UI input styling with legible text and high contrast
export const inp =
  'rounded-xl border border-warm-300 bg-white px-3.5 py-2 text-sm font-medium text-warm-900 placeholder-warm-400 outline-none transition duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs selection:bg-amber-200 selection:text-stone-950'

// Reliably resolve image URLs across local mobile, dev proxy, and production
export function formatImageUrl(url) {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    if (url.includes('localhost:8000/storage/')) {
      return url.substring(url.indexOf('/storage/'))
    }
    return url
  }
  return url.startsWith('/') ? url : '/' + url
}

// Pleasant harmonic chime using Web Audio API (zero audio file dependency)
export function playChime(type = 'ticket') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'ticket') {
      // Ascending pleasant notification chime (C5 -> G5)
      osc1.frequency.setValueAtTime(523.25, now) // C5
      osc1.frequency.setValueAtTime(783.99, now + 0.12) // G5
      osc2.frequency.setValueAtTime(659.25, now) // E5
      osc2.frequency.setValueAtTime(1046.5, now + 0.12) // C6
    } else {
      // Soft ping
      osc1.frequency.setValueAtTime(880, now)
      osc2.frequency.setValueAtTime(440, now)
    }

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.45)
    osc2.stop(now + 0.45)
  } catch {
    // Audio context may be restricted by autoplay policy until user interacts
  }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = { Accept: 'application/json' }
  const t = getToken()
  if (t) headers.Authorization = 'Bearer ' + t
  let reqMethod = method
  let payload
  if (form) {
    if (form instanceof FormData && (method === 'PATCH' || method === 'PUT')) {
      form.append('_method', method)
      reqMethod = 'POST'
    }
    payload = form
  } else if (body) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  if (method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
    headers['X-HTTP-Method-Override'] = method
  }
  const r = await fetch('/api' + path, { method: reqMethod, headers, body: payload })
  if (r.status === 401 && t && path !== '/login') {
    setToken(null)
    location.reload()
  }
  const j = await r.json().catch(() => null)
  if (!r.ok) {
    throw Object.assign(new Error(j?.message || 'Request failed'), { status: r.status, data: j })
  }
  return j
}

function makeEcho(token) {
  const e = import.meta.env
  const https = (e.VITE_REVERB_SCHEME || location.protocol.slice(0, -1)) === 'https'
  return new Echo({
    broadcaster: 'reverb',
    key: e.VITE_REVERB_APP_KEY,
    wsHost: e.VITE_REVERB_HOST || location.hostname,
    wsPort: e.VITE_REVERB_PORT || 80,
    wssPort: e.VITE_REVERB_PORT || 443,
    forceTLS: https,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/api/broadcasting/auth',
    auth: { headers: { Authorization: 'Bearer ' + token } },
  })
}

// Real-time: refresh when server broadcasts "pos.updated"
export function useLive(isStaff, onUpdate) {
  const ref = useRef(onUpdate)
  ref.current = onUpdate
  useEffect(() => {
    let echo = null
    try {
      echo = makeEcho(isStaff ? getToken() : null)
      const ch = isStaff ? echo.private('staff') : echo.channel('pos')
      ch.listen('.pos.updated', () => ref.current())
    } catch {
      // Reverb fallback handles updates smoothly
    }
    const poll = setInterval(() => ref.current(), 12000)
    return () => {
      clearInterval(poll)
      if (echo) echo.disconnect()
    }
  }, [isStaff])
}
