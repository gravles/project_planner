import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHotkeys } from 'react-hotkeys-hook'
import { useUIStore } from '../../stores/uiStore'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import FilterBar from './FilterBar'
import MobileTabBar from './MobileTabBar'
import NewProjectModal from '../projects/NewProjectModal'
import AIAddModal from '../projects/AIAddModal'
import ShortcutsModal from '../ui/ShortcutsModal'
import CommandPalette from '../CommandPalette'
import { useCreateProject } from '../../hooks/useProjects'

export default function AppShell({ children, projectPage = false }) {
  const navigate = useNavigate()
  const {
    sidebarOpen, toggleSidebar, setViewMode, detailProjectId, closeDetail,
    newProjectOpen, setNewProjectOpen, aiAddOpen, setAiAddOpen,
  } = useUIStore()
  const createProject = useCreateProject()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  async function handleCreate(data) {
    await createProject.mutateAsync(data)
  }

  // ── Global keyboard shortcuts (inactive while typing in a field) ──────────
  useHotkeys('n', () => setNewProjectOpen(true), { preventDefault: true })
  useHotkeys('a', () => setAiAddOpen(true), { preventDefault: true })
  useHotkeys('b', () => { setViewMode('board'); navigate('/') })
  useHotkeys('l', () => { setViewMode('list'); navigate('/') })
  useHotkeys('c', () => { setViewMode('calendar'); navigate('/') })
  useHotkeys('d', () => navigate('/dashboard'))
  useHotkeys('shift+slash', () => setShortcutsOpen(o => !o))
  useHotkeys('escape', () => {
    if (shortcutsOpen) setShortcutsOpen(false)
    else if (newProjectOpen) setNewProjectOpen(false)
    else if (aiAddOpen) setAiAddOpen(false)
    else if (detailProjectId) closeDetail()
  }, { enableOnFormTags: true })

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden">

      {/* Mobile backdrop — closes sidebar on tap */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 sm:hidden"
          onClick={toggleSidebar}
        />
      )}

      <Sidebar open={sidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          projectPage={projectPage}
          onNewProject={() => setNewProjectOpen(true)}
          onAIAdd={() => setAiAddOpen(true)}
        />
        {projectPage && <FilterBar />}

        {/* pb keeps content clear of the mobile tab bar */}
        <main className="flex-1 overflow-hidden flex flex-col pb-14 sm:pb-0">
          {children}
        </main>
      </div>

      <MobileTabBar />

      <NewProjectModal
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreate={handleCreate}
      />
      <AIAddModal
        open={aiAddOpen}
        onClose={() => setAiAddOpen(false)}
        onCreate={handleCreate}
      />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <CommandPalette
        onNewProject={() => setNewProjectOpen(true)}
        onAIAdd={() => setAiAddOpen(true)}
      />
    </div>
  )
}
