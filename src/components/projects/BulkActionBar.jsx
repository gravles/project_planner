import { AnimatePresence, motion } from 'framer-motion'
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../lib/utils'

export default function BulkActionBar({ selectedCount, onClearSelection, onBulkStatus, onBulkPriority, onBulkDelete }) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-bg-surface border border-border rounded-2xl px-5 py-3 flex items-center gap-4 shadow-2xl"
        >
          <span className="text-sm font-semibold text-text-primary whitespace-nowrap">
            {selectedCount} selected
          </span>

          <div className="w-px h-5 bg-border shrink-0" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Status</span>
            <select
              defaultValue=""
              onChange={e => { if (e.target.value) { onBulkStatus(e.target.value); e.target.value = '' } }}
              className="text-xs bg-bg-elevated border border-border rounded-lg px-2 py-1 text-text-secondary focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="" disabled>Change…</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Priority</span>
            <select
              defaultValue=""
              onChange={e => { if (e.target.value) { onBulkPriority(e.target.value); e.target.value = '' } }}
              className="text-xs bg-bg-elevated border border-border rounded-lg px-2 py-1 text-text-secondary focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="" disabled>Change…</option>
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="w-px h-5 bg-border shrink-0" />

          <button
            onClick={onBulkDelete}
            className="text-xs text-danger hover:bg-danger/10 px-2 py-1 rounded-lg transition-colors"
          >
            Delete
          </button>

          <button
            onClick={onClearSelection}
            className="text-text-muted hover:text-text-primary transition-colors text-xs"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
