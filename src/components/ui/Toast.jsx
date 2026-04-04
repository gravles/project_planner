import { AnimatePresence, motion } from 'framer-motion'
import { useToastStore } from '../../stores/toastStore'

const STYLES = {
  success: { bar: 'border-success/30 bg-success/10', icon: '✓', iconColor: 'text-success' },
  error:   { bar: 'border-danger/30 bg-danger/10',   icon: '✕', iconColor: 'text-danger' },
  info:    { bar: 'border-info/30 bg-info/10',         icon: 'i', iconColor: 'text-info' },
}

export default function Toast() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => {
          const s = STYLES[t.type] ?? STYLES.info
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl bg-bg-surface min-w-[240px] max-w-sm ${s.bar}`}
            >
              <span className={`font-bold text-sm shrink-0 ${s.iconColor}`}>{s.icon}</span>
              <span className="flex-1 text-sm text-text-primary">{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-text-muted hover:text-text-primary transition-colors text-xs"
              >
                ✕
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
