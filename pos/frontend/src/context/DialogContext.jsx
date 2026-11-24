import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import logo from '../assets/imgs/logo.jpg'

const DialogContext = createContext(null)

export function DialogProvider({ children }) {
  const [modal, setModal] = useState(null)
  const [toasts, setToasts] = useState([])

  // Custom Confirmation Dialog (Promise-based)
  const confirm = useCallback(({
    title = 'Please Confirm',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Yes, Proceed',
    cancelText = 'Cancel',
    type = 'danger', // 'danger' | 'warning' | 'info'
    meta = null,
  }) => {
    return new Promise((resolve) => {
      setModal({
        kind: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        type,
        meta,
        onConfirm: () => {
          setModal(null)
          resolve(true)
        },
        onCancel: () => {
          setModal(null)
          resolve(false)
        },
      })
    })
  }, [])

  // Custom Alert / Notice Dialog (Promise-based)
  const alert = useCallback(({
    title = 'Notification',
    message = '',
    buttonText = 'Understood',
    type = 'info', // 'success' | 'error' | 'warning' | 'info'
  }) => {
    return new Promise((resolve) => {
      setModal({
        kind: 'alert',
        title,
        message,
        buttonText,
        type,
        onClose: () => {
          setModal(null)
          resolve()
        },
      })
    })
  }, [])

  // Floating Toast Notification
  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Replace native browser window.alert so no browser dialog ever triggers!
  useEffect(() => {
    const originalAlert = window.alert
    window.alert = (msg) => {
      toast(String(msg || ''), 'info', 4500)
    }
    window.__customConfirm = confirm
    window.__customAlert = alert
    window.__customToast = toast

    return () => {
      window.alert = originalAlert
    }
  }, [confirm, alert, toast])

  // Dismiss modal on Escape key
  useEffect(() => {
    if (!modal) return
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (modal.kind === 'confirm') modal.onCancel()
        else if (modal.kind === 'alert') modal.onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [modal])

  return (
    <DialogContext.Provider value={{ confirm, alert, toast }}>
      {children}

      {/* Floating In-App Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 duration-200 ${
                t.type === 'error'
                  ? 'bg-rose-900/90 text-white border-rose-700'
                  : t.type === 'success'
                  ? 'bg-emerald-900/90 text-white border-emerald-700'
                  : t.type === 'warning'
                  ? 'bg-amber-900/90 text-white border-amber-700'
                  : 'bg-warm-900/95 text-white border-warm-800'
              }`}
            >
              <div className="mt-0.5 shrink-0 text-base">
                {t.type === 'error' && '⚠️'}
                {t.type === 'success' && '✓'}
                {t.type === 'warning' && '⚡'}
                {t.type === 'info' && 'ℹ️'}
              </div>
              <div className="flex-1 text-xs sm:text-sm font-medium leading-snug">
                {t.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-white/60 hover:text-white transition p-0.5"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Custom Center Modal Popup */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (modal.kind === 'confirm') modal.onCancel()
            else modal.onClose()
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-warm-200 text-left transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Brand Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-warm-100">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-white border border-warm-200 p-0.5 overflow-hidden shadow-xs">
                  <img src={logo} alt="MOLS MAISON" className="h-full w-full object-contain rounded-md" />
                </div>
                <span className="font-logo text-xs font-semibold tracking-wider text-warm-700">MOLS MAISON POS</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (modal.kind === 'confirm') modal.onCancel()
                  else modal.onClose()
                }}
                className="rounded-xl p-1 text-warm-400 hover:bg-warm-100 hover:text-warm-700 transition"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex items-start gap-3.5 mt-2">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-xs text-lg ${
                  modal.type === 'danger' || modal.type === 'error'
                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                    : modal.type === 'warning'
                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : modal.type === 'success'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-warm-100 text-warm-800 border-warm-200'
                }`}
              >
                {modal.type === 'danger' || modal.type === 'error' ? '🗑️' : modal.type === 'warning' ? '⚠️' : modal.type === 'success' ? '✓' : 'ℹ️'}
              </div>
              <div className="flex-1 pr-2">
                <h3 className="font-display text-lg font-bold text-warm-900 leading-snug">
                  {modal.title}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-warm-600 leading-relaxed">
                  {modal.message}
                </p>
                {modal.meta && (
                  <div className="mt-3 rounded-xl bg-warm-50 border border-warm-200/80 p-2.5 text-xs text-warm-700 font-mono">
                    {modal.meta}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              {modal.kind === 'confirm' ? (
                <>
                  <button
                    type="button"
                    onClick={modal.onCancel}
                    className="w-full sm:w-auto rounded-xl border border-warm-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-warm-700 hover:bg-warm-100 transition shadow-xs"
                  >
                    {modal.cancelText}
                  </button>
                  <button
                    type="button"
                    onClick={modal.onConfirm}
                    className={`w-full sm:w-auto rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition ${
                      modal.type === 'danger'
                        ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                        : modal.type === 'warning'
                        ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                        : 'bg-warm-900 hover:bg-warm-800 active:bg-warm-950'
                    }`}
                  >
                    {modal.confirmText}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={modal.onClose}
                  className="w-full sm:w-auto rounded-xl bg-warm-900 px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-warm-800 active:bg-warm-950 transition shadow-xs"
                >
                  {modal.buttonText || 'Understood'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const ctx = useContext(DialogContext)
  if (!ctx) {
    // Graceful fallback if used outside DialogProvider
    return {
      confirm: ({ message }) => Promise.resolve(window.confirm ? window.confirm(message) : true),
      alert: ({ message }) => { if (window.alert) window.alert(message); return Promise.resolve(); },
      toast: (msg) => { if (window.alert) window.alert(msg); },
    }
  }
  return ctx
}
