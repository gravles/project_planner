import { motion, AnimatePresence } from 'framer-motion'
import { useModalA11y } from '../../hooks/useModalA11y'

const SHORTCUTS = [
  { keys: ['N'], label: 'New project' },
  { keys: ['A'], label: 'AI quick-add' },
  { keys: ['⌘', 'K'], label: 'Command palette' },
  { keys: ['F'], label: 'Focus search' },
  { keys: ['B'], label: 'Board view' },
  { keys: ['L'], label: 'List view' },
  { keys: ['C'], label: 'Calendar view' },
  { keys: ['D'], label: 'Go to dashboard' },
  { keys: ['Esc'], label: 'Close panel / modal' },
  { keys: ['?'], label: 'Show this help' },
]

export default function ShortcutsModal({ open, onClose }) {
  const panelRef = useModalA11y(open)
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[90]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.16 }}
            role="dialog"
            aria-label="Keyboard shortcuts"
            className="fixed inset-0 z-[95] flex items-center justify-center p-4 pointer-events-none"
          >
            <div ref={panelRef} className="bg-bg-surface border border-border rounded-2xl w-full max-w-sm shadow-2xl pointer-events-auto">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-text-primary">Keyboard shortcuts</h2>
                <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors text-xs p-1">✕</button>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                {SHORTCUTS.map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">{s.label}</span>
                    <span className="flex gap-1">
                      {s.keys.map(k => (
                        <kbd key={k} className="text-[11px] text-text-secondary font-mono bg-bg-elevated px-1.5 py-0.5 rounded border border-border min-w-[22px] text-center">
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
