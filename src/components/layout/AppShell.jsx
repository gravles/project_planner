import { useState } from 'react'
import { useUIStore } from '../../stores/uiStore'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import FilterBar from './FilterBar'
import NewProjectModal from '../projects/NewProjectModal'
import AIAddModal from '../projects/AIAddModal'
import { useCreateProject } from '../../hooks/useProjects'

export default function AppShell({ children, projectPage = false }) {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const createProject = useCreateProject()
  const [newOpen, setNewOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  async function handleCreate(data) {
    await createProject.mutateAsync(data)
  }

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
          onNewProject={() => setNewOpen(true)}
          onAIAdd={() => setAiOpen(true)}
        />
        {projectPage && <FilterBar />}

        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>

      <NewProjectModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreate={handleCreate}
      />
      <AIAddModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}
