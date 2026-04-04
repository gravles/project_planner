import { create } from 'zustand'

let nextId = 0

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = ++nextId
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 3500)
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

// Imperative helper — safe to call from mutation callbacks outside React
export const toast = {
  success: (msg) => useToastStore.getState().addToast(msg, 'success'),
  error:   (msg) => useToastStore.getState().addToast(msg, 'error'),
  info:    (msg) => useToastStore.getState().addToast(msg, 'info'),
}
