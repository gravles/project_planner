import { useUIStore } from '../../stores/uiStore'

const VIEW_TABS = [
  { key: 'board', label: 'Board', shortcut: 'B' },
  { key: 'list', label: 'List', shortcut: 'L' },
]

export default function Topbar({ onNewProject, onAIAdd }) {
  const { sidebarOpen, toggleSidebar, viewMode, setViewMode } = useUIStore()

  return (
    <header className="h-14 shrink-0 bg-bg-surface border-b border-border flex items-center px-4 gap-4">
      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* View tabs */}
      <div className="flex items-center gap-0.5 bg-bg-elevated rounded-lg p-1">
        {VIEW_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === tab.key
                ? 'bg-bg-surface text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <button
        onClick={onAIAdd}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-elevated border border-border transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
        </svg>
        AI Add
        <kbd className="ml-0.5 text-[10px] text-text-muted font-mono bg-bg-base px-1 py-0.5 rounded border border-border">A</kbd>
      </button>

      <button
        onClick={onNewProject}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New
        <kbd className="ml-0.5 text-[10px] text-bg-base/60 font-mono bg-bg-base/20 px-1 py-0.5 rounded">N</kbd>
      </button>
    </header>
  )
}
