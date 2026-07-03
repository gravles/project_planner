import { create } from 'zustand'

let nextId = 0

export const useToastStore = create((set) => ({
  toasts: [],
  // opts: { action: { label, onClick }, duration }
  addToast: (message, type = 'success', opts = {}) => {
    const id = ++nextId
    const duration = opts.duration ?? (opts.action ? 6000 : 3500)
    set(s => ({ toasts: [...s.toasts, { id, message, type, action: opts.action ?? null }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), duration)
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

// Imperative helper — safe to call from mutation callbacks outside React
export const toast = {
  success: (msg, opts) => useToastStore.getState().addToast(msg, 'success', opts),
  error:   (msg, opts) => useToastStore.getState().addToast(msg, 'error', opts),
  info:    (msg, opts) => useToastStore.getState().addToast(msg, 'info', opts),
}
