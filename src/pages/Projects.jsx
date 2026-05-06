import { useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import AppShell from '../components/layout/AppShell'
import { filterProjects } from '../lib/projectFilters'
import BoardView from '../components/projects/BoardView'
import ListView from '../components/projects/ListView'
import CalendarView from '../components/projects/CalendarView'
import ProjectDetail from '../components/projects/ProjectDetail'
import { useProjects, useUpdateProject } from '../hooks/useProjects'
import { useUIStore } from '../stores/uiStore'
import QuickSpendFAB from '../components/projects/QuickSpendFAB'

export default function Projects() {
  const { viewMode, activeProperty, detailProjectId, openDetail, closeDetail, searchQuery, activeFilters } = useUIStore()
  const { data: projects = [], isLoading } = useProjects(activeProperty)
  const updateProject = useUpdateProject()

  const filtered = useMemo(
    () => filterProjects(projects, searchQuery, activeFilters),
    [projects, searchQuery, activeFilters]
  )

  function handleUpdateStatus(id, status) {
    updateProject.mutate({ id, status })
  }

  return (
    <AppShell projectPage>
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Main content area */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
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
        </div>

        {/* Detail panel — inline on desktop, fixed overlay on mobile */}
        <AnimatePresence>
          {detailProjectId && (
            <ProjectDetail key={detailProjectId} projectId={detailProjectId} onClose={closeDetail} />
          )}
        </AnimatePresence>
      </div>

      <QuickSpendFAB />
    </AppShell>
  )
}
