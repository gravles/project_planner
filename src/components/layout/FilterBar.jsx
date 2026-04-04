import { AnimatePresence, motion } from 'framer-motion'
import { useUIStore } from '../../stores/uiStore'
import { useTags } from '../../hooks/useAdmin'
import { STATUS_OPTIONS, PRIORITY_OPTIONS, STATUS_COLORS, PRIORITY_COLORS, cn } from '../../lib/utils'

export default function FilterBar() {
  const {
    filterBarOpen,
    activeFilters,
    toggleFilterStatus,
    toggleFilterPriority,
    toggleFilterTag,
    setFilterOverdue,
    setFilterHideDone,
    clearFilters,
  } = useUIStore()
  const { data: tags = [] } = useTags()

  const hasFilters =
    activeFilters.statuses.length > 0 ||
    activeFilters.priorities.length > 0 ||
    activeFilters.tagIds.length > 0 ||
    activeFilters.overdue ||
    activeFilters.hideDone

  return (
    <AnimatePresence>
      {filterBarOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="overflow-hidden border-b border-border bg-bg-surface shrink-0"
        >
          <div className="px-5 py-3 flex items-center gap-5 flex-wrap">
            {/* Status */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Status</span>
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => toggleFilterStatus(s)}
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full border font-medium transition-all',
                    activeFilters.statuses.includes(s)
                      ? cn(STATUS_COLORS[s], 'border-transparent')
                      : 'border-border text-text-muted hover:border-border-hover',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Priority */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Priority</span>
              {PRIORITY_OPTIONS.map(p => (
                <button
                  key={p}
                  onClick={() => toggleFilterPriority(p)}
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full border font-medium transition-all',
                    activeFilters.priorities.includes(p)
                      ? cn('bg-bg-elevated border-border-hover', PRIORITY_COLORS[p])
                      : 'border-border text-text-muted hover:border-border-hover',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Tags</span>
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleFilterTag(tag.id)}
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full border font-medium transition-all',
                      activeFilters.tagIds.includes(tag.id)
                        ? 'border-transparent'
                        : 'border-border text-text-muted hover:border-border-hover',
                    )}
                    style={activeFilters.tagIds.includes(tag.id)
                      ? { backgroundColor: `${tag.color}22`, borderColor: tag.color, color: tag.color }
                      : {}}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}

            {/* Toggles + clear */}
            <div className="flex items-center gap-4 ml-auto">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activeFilters.overdue}
                  onChange={e => setFilterOverdue(e.target.checked)}
                  className="accent-danger"
                />
                <span className="text-xs text-text-secondary">Overdue only</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activeFilters.hideDone}
                  onChange={e => setFilterHideDone(e.target.checked)}
                  className="accent-accent"
                />
                <span className="text-xs text-text-secondary">Hide done</span>
              </label>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-accent hover:text-amber-300 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
