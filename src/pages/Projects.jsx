import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useHotkeys } from 'react-hotkeys-hook'
import AppShell from '../components/layout/AppShell'
import BoardView from '../components/projects/BoardView'
import ListView from '../components/projects/ListView'
import ProjectDetail from '../components/projects/ProjectDetail'
import NewProjectModal from '../components/projects/NewProjectModal'
import AIAddModal from '../components/projects/AIAddModal'
import { useProjects, useCreateProject, useUpdateProject } from '../hooks/useProjects'
import { useUIStore } from '../stores/uiStore'

export default function Projects() {
  const { viewMode, activeProperty, detailProjectId, openDetail, closeDetail } = useUIStore()
  const { data: projects = [], isLoading } = useProjects(activeProperty)
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()

  const [newOpen, setNewOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  const noModal = !newOpen && !aiOpen && !detailProjectId
  useHotkeys('n', () => setNewOpen(true), { enabled: noModal })
  useHotkeys('a', () => setAiOpen(true), { enabled: noModal })
  useHotkeys('escape', () => {
    if (detailProjectId) closeDetail()
    else if (newOpen) setNewOpen(false)
    else if (aiOpen) setAiOpen(false)
  })

  async function handleCreate(data) {
    await createProject.mutateAsync(data)
  }

  function handleUpdateStatus(id, status) {
    updateProject.mutate({ id, status })
  }

  return (
    <AppShell onNewProject={() => setNewOpen(true)} onAIAdd={() => setAiOpen(true)}>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center h-full">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === 'board' ? (
        <BoardView
          projects={projects}
          onOpen={openDetail}
          onUpdateStatus={handleUpdateStatus}
        />
      ) : (
        <ListView projects={projects} onOpen={openDetail} />
      )}

      {/* Detail panel */}
      <AnimatePresence>
        {detailProjectId && (
          <ProjectDetail key={detailProjectId} projectId={detailProjectId} onClose={closeDetail} />
        )}
      </AnimatePresence>

      {/* Modals */}
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
    </AppShell>
  )
}
