import { isAfter, parseISO, startOfDay } from 'date-fns'

export function filterProjects(projects, searchQuery, activeFilters) {
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
    list = list.filter(p =>
      p.due_date && p.status !== 'Done' && isAfter(today, parseISO(p.due_date))
    )
  }
  if (activeFilters?.hideDone) {
    list = list.filter(p => p.status !== 'Done')
  }

  return list
}
