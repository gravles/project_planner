import { useRef } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useUIStore } from '../../stores/uiStore'

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useUIStore()
  const inputRef = useRef(null)

  useHotkeys('f', (e) => {
    e.preventDefault()
    inputRef.current?.focus()
    inputRef.current?.select()
  })

  return (
    <div className="relative flex items-center">
      <svg className="absolute left-2.5 w-3.5 h-3.5 text-text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search… (F)"
        className="w-40 bg-bg-elevated border border-border rounded-lg pl-8 pr-6 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent focus:w-52 transition-all"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-2 text-text-muted hover:text-text-primary transition-colors text-xs"
        >
          ✕
        </button>
      )}
    </div>
  )
}
