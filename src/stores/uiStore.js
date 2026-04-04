import { create } from 'zustand'

export const useUIStore = create((set) => ({
  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  // View mode: 'board' | 'list' | 'calendar'
  viewMode: 'board',
  setViewMode: (viewMode) => set({ viewMode }),

  // Active property filter (null = all) — uses property name string
  activeProperty: null,
  setActiveProperty: (activeProperty) => set({ activeProperty }),

  // Project detail panel
  detailProjectId: null,
  openDetail: (id) => set({ detailProjectId: id }),
  closeDetail: () => set({ detailProjectId: null }),

  // Search query
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  // Filter bar visibility
  filterBarOpen: false,
  toggleFilterBar: () => set(s => ({ filterBarOpen: !s.filterBarOpen })),

  // Active filters
  activeFilters: {
    statuses: [],
    priorities: [],
    tagIds: [],
    overdue: false,
    hideDone: false,
  },
  toggleFilterStatus: (status) => set(s => {
    const f = s.activeFilters
    return { activeFilters: { ...f, statuses: f.statuses.includes(status) ? f.statuses.filter(x => x !== status) : [...f.statuses, status] } }
  }),
  toggleFilterPriority: (priority) => set(s => {
    const f = s.activeFilters
    return { activeFilters: { ...f, priorities: f.priorities.includes(priority) ? f.priorities.filter(x => x !== priority) : [...f.priorities, priority] } }
  }),
  toggleFilterTag: (tagId) => set(s => {
    const f = s.activeFilters
    return { activeFilters: { ...f, tagIds: f.tagIds.includes(tagId) ? f.tagIds.filter(x => x !== tagId) : [...f.tagIds, tagId] } }
  }),
  setFilterOverdue: (overdue) => set(s => ({ activeFilters: { ...s.activeFilters, overdue } })),
  setFilterHideDone: (hideDone) => set(s => ({ activeFilters: { ...s.activeFilters, hideDone } })),
  clearFilters: () => set({
    searchQuery: '',
    activeFilters: { statuses: [], priorities: [], tagIds: [], overdue: false, hideDone: false },
  }),
}))
