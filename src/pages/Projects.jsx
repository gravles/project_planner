import { useState, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useHotkeys } from 'react-hotkeys-hook'
import { isAfter, parseISO, startOfDay } from 'date-fns'
import AppShell from '../components/layout/AppShell'
import BoardView from '../components/projects/BoardView'
import ListView from '../components/projects/ListView'
import CalendarView from '../components/projects/CalendarView'
import ProjectDetail from '../components/projects/ProjectDetail'
import NewProjectModal from '../components/projects/NewProjectModal'
import AIAddModal from '../components/projects/AIAddModal'
import { useProjects, useCreateProject, useUpdateProject } from '../hooks/useProjects'
import { useUIStore } from '../stores/uiStore'

export default function Projects() {
  const { viewMode, activeProperty, detailProjectId, openDetail, closeDetail, searchQuery, activeFilters } = useUIStore()
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

  // Client-side filtering
  const filtered = useMemo(() => {
    let list = projects
    const q = searchQuery?.trim().toLowerCase()
    if (q) {
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.room?.toLowerCase().includes(q) ||
        p.vendor?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q)
      )
    }
    if (activeFilters?.statuses?.length) {
      list = list.filter(p => activeFilters.statuses.includes(p.status))
    }
    if (activeFilters?.priorities?.length) {
      list = list.filter(p => activeFilters.priorities.includes(p.priority))
    }
    if (activeFilters?.tagIds?.length) {
      list = list.filter(p =>
        activeFilters.tagIds.every(tid => p.project_tags?.some(pt => pt.tag_id === tid))
      )
    }
    if (activeFilters?.overdue) {
      const today = startOfDay(new Date())
      list = list.filter(p => p.due_date && p.status !== 'Done' && isAfter(today, parseISO(p.due_date)))
    }
    if (activeFilters?.hideDone) {
      list = list.filter(p => p.status !== 'Done')
    }
    return list
  }, [projects, searchQuery, activeFilters])

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
          projects={filtered}
          onOpen={openDetail}
          onUpdateStatus={handleUpdateStatus}
        />
      ) : viewMode === 'calendar' ? (
        <CalendarView projects={filtered} onOpen={openDetail} />
      ) : (
        <ListView projects={filtered} onOpen={openDetail} />
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
