import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../stores/uiStore'

const INITIAL = {
  sidebarOpen: true,
  viewMode: 'board',
  activeProperty: null,
  detailProjectId: null,
  searchQuery: '',
  filterBarOpen: false,
  activeFilters: { statuses: [], priorities: [], tagIds: [], overdue: false, hideDone: false },
}

beforeEach(() => {
  useUIStore.setState(INITIAL)
})

describe('sidebar', () => {
  it('starts open', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(true)
  })
  it('toggles closed', () => {
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(false)
  })
  it('toggles back open', () => {
    useUIStore.getState().toggleSidebar()
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(true)
  })
})

describe('viewMode', () => {
  it('defaults to board', () => {
    expect(useUIStore.getState().viewMode).toBe('board')
  })
  it('switches to list', () => {
    useUIStore.getState().setViewMode('list')
    expect(useUIStore.getState().viewMode).toBe('list')
  })
  it('switches to calendar', () => {
    useUIStore.getState().setViewMode('calendar')
    expect(useUIStore.getState().viewMode).toBe('calendar')
  })
})

describe('detail panel', () => {
  it('starts with no open project', () => {
    expect(useUIStore.getState().detailProjectId).toBeNull()
  })
  it('opens with a project id', () => {
    useUIStore.getState().openDetail('proj-abc')
    expect(useUIStore.getState().detailProjectId).toBe('proj-abc')
  })
  it('closes and clears the id', () => {
    useUIStore.getState().openDetail('proj-abc')
    useUIStore.getState().closeDetail()
    expect(useUIStore.getState().detailProjectId).toBeNull()
  })
  it('replaces an existing open project', () => {
    useUIStore.getState().openDetail('proj-1')
    useUIStore.getState().openDetail('proj-2')
    expect(useUIStore.getState().detailProjectId).toBe('proj-2')
  })
})

describe('search query', () => {
  it('starts empty', () => {
    expect(useUIStore.getState().searchQuery).toBe('')
  })
  it('updates the query', () => {
    useUIStore.getState().setSearchQuery('bathroom')
    expect(useUIStore.getState().searchQuery).toBe('bathroom')
  })
})

describe('filter bar', () => {
  it('starts closed', () => {
    expect(useUIStore.getState().filterBarOpen).toBe(false)
  })
  it('toggles open', () => {
    useUIStore.getState().toggleFilterBar()
    expect(useUIStore.getState().filterBarOpen).toBe(true)
  })
})

describe('status filter', () => {
  it('adds a status', () => {
    useUIStore.getState().toggleFilterStatus('Backlog')
    expect(useUIStore.getState().activeFilters.statuses).toContain('Backlog')
  })
  it('removes a status on second toggle', () => {
    useUIStore.getState().toggleFilterStatus('Backlog')
    useUIStore.getState().toggleFilterStatus('Backlog')
    expect(useUIStore.getState().activeFilters.statuses).not.toContain('Backlog')
  })
  it('can hold multiple statuses', () => {
    useUIStore.getState().toggleFilterStatus('Backlog')
    useUIStore.getState().toggleFilterStatus('Done')
    expect(useUIStore.getState().activeFilters.statuses).toEqual(['Backlog', 'Done'])
  })
  it('removing one status leaves others intact', () => {
    useUIStore.getState().toggleFilterStatus('Backlog')
    useUIStore.getState().toggleFilterStatus('Done')
    useUIStore.getState().toggleFilterStatus('Backlog')
    expect(useUIStore.getState().activeFilters.statuses).toEqual(['Done'])
  })
})

describe('priority filter', () => {
  it('adds a priority', () => {
    useUIStore.getState().toggleFilterPriority('High')
    expect(useUIStore.getState().activeFilters.priorities).toContain('High')
  })
  it('removes a priority on second toggle', () => {
    useUIStore.getState().toggleFilterPriority('High')
    useUIStore.getState().toggleFilterPriority('High')
    expect(useUIStore.getState().activeFilters.priorities).not.toContain('High')
  })
})

describe('tag filter', () => {
  it('adds a tag id', () => {
    useUIStore.getState().toggleFilterTag('tag-1')
    expect(useUIStore.getState().activeFilters.tagIds).toContain('tag-1')
  })
  it('removes a tag on second toggle', () => {
    useUIStore.getState().toggleFilterTag('tag-1')
    useUIStore.getState().toggleFilterTag('tag-1')
    expect(useUIStore.getState().activeFilters.tagIds).not.toContain('tag-1')
  })
})

describe('overdue and hideDone flags', () => {
  it('sets overdue to true', () => {
    useUIStore.getState().setFilterOverdue(true)
    expect(useUIStore.getState().activeFilters.overdue).toBe(true)
  })
  it('sets overdue back to false', () => {
    useUIStore.getState().setFilterOverdue(true)
    useUIStore.getState().setFilterOverdue(false)
    expect(useUIStore.getState().activeFilters.overdue).toBe(false)
  })
  it('sets hideDone to true', () => {
    useUIStore.getState().setFilterHideDone(true)
    expect(useUIStore.getState().activeFilters.hideDone).toBe(true)
  })
})

describe('clearFilters', () => {
  it('resets search query and all filters', () => {
    useUIStore.getState().setSearchQuery('test')
    useUIStore.getState().toggleFilterStatus('Done')
    useUIStore.getState().toggleFilterPriority('High')
    useUIStore.getState().toggleFilterTag('tag-1')
    useUIStore.getState().setFilterOverdue(true)
    useUIStore.getState().setFilterHideDone(true)

    useUIStore.getState().clearFilters()

    const { searchQuery, activeFilters } = useUIStore.getState()
    expect(searchQuery).toBe('')
    expect(activeFilters).toEqual({
      statuses: [], priorities: [], tagIds: [], overdue: false, hideDone: false,
    })
  })
  it('does not affect viewMode or sidebarOpen', () => {
    useUIStore.getState().setViewMode('list')
    useUIStore.getState().clearFilters()
    expect(useUIStore.getState().viewMode).toBe('list')
  })
})
