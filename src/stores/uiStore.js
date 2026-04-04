import { create } from 'zustand'

export const useUIStore = create((set) => ({
  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  // View mode: 'board' | 'list' | 'dashboard'
  viewMode: 'board',
  setViewMode: (viewMode) => set({ viewMode }),

  // Active property filter (null = all)
  activeProperty: null,
  setActiveProperty: (activeProperty) => set({ activeProperty }),

  // Project detail panel
  detailProjectId: null,
  openDetail: (id) => set({ detailProjectId: id }),
  closeDetail: () => set({ detailProjectId: null }),
}))
