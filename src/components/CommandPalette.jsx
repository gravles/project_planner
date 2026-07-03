import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useHotkeys } from 'react-hotkeys-hook'
import { useProjects } from '../hooks/useProjects'
import { useVendors } from '../hooks/useVendors'
import { useProperties } from '../hooks/useProperties'
import { useUIStore } from '../stores/uiStore'
import { fuzzyFilter } from '../lib/fuzzy'
import { cn, STATUS_COLORS } from '../lib/utils'

const RECENTS_KEY = 'pp-palette-recents'
const MAX_RECENTS = 8
const MAX_PER_SECTION = 6

function loadRecents() {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY)) ?? [] } catch { return [] }
}

function pushRecent(key) {
  const next = [key, ...loadRecents().filter(k => k !== key)].slice(0, MAX_RECENTS)
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
}

export default function CommandPalette({ onNewProject, onAIAdd }) {
  const navigate = useNavigate()
  const { setViewMode, setActiveProperty, openDetail } = useUIStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const { data: projects = [] } = useProjects()
  const { data: vendors = [] } = useVendors()
  const { data: properties = [] } = useProperties()

  useHotkeys('mod+k', () => { setOpen(o => !o); setQuery(''); setActiveIndex(0) },
    { enableOnFormTags: true, preventDefault: true })

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  function close() {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  function run(entry) {
    pushRecent(entry.key)
    close()
    entry.action()
  }

  // ── Build the searchable entries ──────────────────────────────────────────
  const entries = useMemo(() => {
    const actions = [
      { key: 'act:new', section: 'Actions', label: 'New project', hint: 'N', action: () => onNewProject() },
      { key: 'act:ai', section: 'Actions', label: 'AI quick-add', hint: 'A', action: () => onAIAdd() },
      { key: 'act:board', section: 'Actions', label: 'Board view', hint: 'B', action: () => { setViewMode('board'); navigate('/') } },
      { key: 'act:list', section: 'Actions', label: 'List view', hint: 'L', action: () => { setViewMode('list'); navigate('/') } },
      { key: 'act:calendar', section: 'Actions', label: 'Calendar view', hint: 'C', action: () => { setViewMode('calendar'); navigate('/') } },
      { key: 'act:dashboard', section: 'Actions', label: 'Go to Dashboard', hint: 'D', action: () => navigate('/dashboard') },
      { key: 'act:reports', section: 'Actions', label: 'Go to Reports', action: () => navigate('/reports') },
      { key: 'act:vendors', section: 'Actions', label: 'Go to Vendors', action: () => navigate('/vendors') },
      { key: 'act:shopping', section: 'Actions', label: 'Go to Shopping List', action: () => navigate('/shopping') },
      { key: 'act:maintenance', section: 'Actions', label: 'Go to Maintenance', action: () => navigate('/maintenance') },
      { key: 'act:documents', section: 'Actions', label: 'Go to Documents', action: () => navigate('/documents') },
      { key: 'act:settings', section: 'Actions', label: 'Go to Settings', action: () => navigate('/admin') },
      { key: 'act:all-properties', section: 'Actions', label: 'Show all properties', action: () => { setActiveProperty(null); navigate('/') } },
    ]
    const projectEntries = projects.map(p => ({
      key: `proj:${p.id}`,
      section: 'Projects',
      label: p.title,
      meta: p.properties?.name,
      status: p.status,
      action: () => { navigate('/'); openDetail(p.id) },
    }))
    const vendorEntries = vendors.map(v => ({
      key: `vend:${v.id}`,
      section: 'Vendors',
      label: v.name,
      meta: v.phone ?? v.email,
      action: () => navigate('/vendors'),
    }))
    const propertyEntries = properties.map(pr => ({
      key: `prop:${pr.id}`,
      section: 'Properties',
      label: `Filter: ${pr.name}`,
      color: pr.color,
      action: () => { setActiveProperty(pr.name); navigate('/') },
    }))
    return [...actions, ...projectEntries, ...vendorEntries, ...propertyEntries]
  }, [projects, vendors, properties, navigate, onNewProject, onAIAdd, setViewMode, setActiveProperty, openDetail])

  // ── Filter + group ─────────────────────────────────────────────────────────
  const visible = useMemo(() => {
    if (!query.trim()) {
      const recents = loadRecents()
        .map(k => entries.find(e => e.key === k))
        .filter(Boolean)
        .map(e => ({ ...e, section: 'Recent' }))
      const actions = entries.filter(e => e.section === 'Actions')
      return [...recents, ...actions]
    }
    const matched = fuzzyFilter(query, entries, e => `${e.label} ${e.meta ?? ''}`)
    // Cap each section so one type doesn't swamp the list
    const counts = {}
    return matched.filter(e => {
      counts[e.section] = (counts[e.section] ?? 0) + 1
      return counts[e.section] <= MAX_PER_SECTION
    })
  }, [query, entries])

  // Reset the highlight when the result set changes
  const visibleKeys = visible.map(e => e.key).join('|')
  const [prevKeys, setPrevKeys] = useState(visibleKeys)
  if (prevKeys !== visibleKeys) {
    setPrevKeys(visibleKeys)
    setActiveIndex(0)
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, visible.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (visible[activeIndex]) run(visible[activeIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  // Keep the active row scrolled into view
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const rows = visible.map((entry, i) => ({
    entry,
    showHeader: i === 0 || entry.section !== visible[i - 1].section,
  }))

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100]"
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.14 }}
            role="dialog"
            aria-label="Command palette"
            className="fixed inset-x-0 top-[15vh] z-[110] flex justify-center px-4 pointer-events-none"
          >
            <div className="bg-bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl pointer-events-auto overflow-hidden">
              <div className="flex items-center gap-3 px-4 border-b border-border">
                <svg className="w-4 h-4 text-text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search projects, vendors, actions…"
                  className="flex-1 bg-transparent py-3.5 text-sm text-text-primary placeholder-text-muted focus:outline-none"
                />
                <kbd className="text-[10px] text-text-muted font-mono bg-bg-elevated px-1.5 py-0.5 rounded border border-border">esc</kbd>
              </div>

              <div ref={listRef} className="max-h-[50vh] overflow-y-auto scrollbar-thin py-2">
                {visible.length === 0 && (
                  <p className="px-4 py-6 text-sm text-text-muted text-center">No matches.</p>
                )}
                {rows.map(({ entry, showHeader }, i) => {
                  return (
                    <div key={entry.key}>
                      {showHeader && (
                        <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                          {entry.section}
                        </p>
                      )}
                      <button
                        data-active={i === activeIndex}
                        onClick={() => run(entry)}
                        onMouseMove={() => setActiveIndex(i)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors',
                          i === activeIndex ? 'bg-accent/10 text-accent' : 'text-text-secondary',
                        )}
                      >
                        {entry.color && (
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        )}
                        <span className="flex-1 truncate">{entry.label}</span>
                        {entry.status && (
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', STATUS_COLORS[entry.status])}>
                            {entry.status}
                          </span>
                        )}
                        {entry.meta && !entry.status && (
                          <span className="text-xs text-text-muted truncate max-w-[35%]">{entry.meta}</span>
                        )}
                        {entry.hint && (
                          <kbd className="text-[10px] text-text-muted font-mono bg-bg-elevated px-1.5 py-0.5 rounded border border-border shrink-0">
                            {entry.hint}
                          </kbd>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
