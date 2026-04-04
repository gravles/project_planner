import { useState, useRef } from 'react'
import { cn } from '../../lib/utils'

/**
 * Creatable combobox. Filters options as you type; shows a "Create X" option
 * when the typed value doesn't match any existing option.
 *
 * Props:
 *   value      – current string value
 *   onChange   – (value: string) => void
 *   options    – string[]
 *   onCreate   – async (name: string) => void  (omit to disable creation)
 *   placeholder
 *   className
 */
export default function Combobox({ value, onChange, options = [], onCreate, placeholder = 'Select…', className = '' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const containerRef = useRef(null)

  const filtered = query.trim()
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options

  const exactMatch = options.some(o => o.toLowerCase() === query.trim().toLowerCase())
  const canCreate = onCreate && query.trim() && !exactMatch

  function handleSelect(option) {
    onChange(option)
    setOpen(false)
    setQuery('')
  }

  async function handleCreate() {
    if (!canCreate || creating) return
    setCreating(true)
    try {
      await onCreate(query.trim())
      onChange(query.trim())
      setOpen(false)
      setQuery('')
    } finally {
      setCreating(false)
    }
  }

  function handleContainerBlur(e) {
    if (!containerRef.current?.contains(e.relatedTarget)) {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)} onBlur={handleContainerBlur}>
      {/* Trigger / input */}
      <div
        className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm flex items-center gap-2 cursor-pointer focus-within:border-accent transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {open ? (
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') { setOpen(false); setQuery('') }
              if (e.key === 'Enter') {
                e.preventDefault()
                if (filtered[0]) handleSelect(filtered[0])
                else if (canCreate) handleCreate()
              }
            }}
            placeholder={value || placeholder}
            className="flex-1 bg-transparent outline-none text-text-primary placeholder-text-muted min-w-0"
          />
        ) : (
          <span className={cn('flex-1', value ? 'text-text-primary' : 'text-text-muted')}>
            {value || placeholder}
          </span>
        )}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          className={cn('shrink-0 text-text-muted transition-transform', open && 'rotate-180')}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-bg-surface border border-border rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto scrollbar-thin">
          {filtered.map(option => (
            <button
              key={option}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(option) }}
              className={cn(
                'w-full px-3 py-2 text-sm text-left transition-colors',
                option === value
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
              )}
            >
              {option}
            </button>
          ))}

          {canCreate && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); handleCreate() }}
              disabled={creating}
              className={cn(
                'w-full px-3 py-2 text-sm text-left transition-colors flex items-center gap-2 text-accent hover:bg-accent/5',
                filtered.length > 0 && 'border-t border-border',
              )}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {creating ? 'Creating…' : `Create "${query.trim()}"`}
            </button>
          )}

          {filtered.length === 0 && !canCreate && (
            <div className="px-3 py-2 text-sm text-text-muted">No options found</div>
          )}
        </div>
      )}
    </div>
  )
}
