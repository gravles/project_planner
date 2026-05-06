import { describe, it, expect } from 'vitest'
import { filterProjects } from '../lib/projectFilters'

const NO_FILTERS = { statuses: [], priorities: [], tagIds: [], overdue: false, hideDone: false }

function makeProject(overrides = {}) {
  return {
    id: Math.random().toString(),
    title: 'Test Project',
    room: 'Kitchen',
    vendor: null,
    notes: null,
    status: 'Backlog',
    priority: 'Medium',
    due_date: null,
    project_tags: [],
    ...overrides,
  }
}

describe('no filters', () => {
  it('returns all projects unchanged', () => {
    const projects = [makeProject({ title: 'A' }), makeProject({ title: 'B' })]
    expect(filterProjects(projects, '', NO_FILTERS)).toHaveLength(2)
  })
  it('returns empty array for empty input', () => {
    expect(filterProjects([], '', NO_FILTERS)).toEqual([])
  })
})

describe('search query', () => {
  it('filters by title (case-insensitive)', () => {
    const projects = [makeProject({ title: 'Bathroom Reno' }), makeProject({ title: 'Kitchen Sink' })]
    expect(filterProjects(projects, 'bathroom', NO_FILTERS)).toHaveLength(1)
  })
  it('filters by room', () => {
    const projects = [makeProject({ room: 'Basement' }), makeProject({ room: 'Kitchen' })]
    expect(filterProjects(projects, 'basement', NO_FILTERS)).toHaveLength(1)
  })
  it('filters by vendor', () => {
    const projects = [makeProject({ vendor: 'ACME Corp' }), makeProject({ vendor: 'Other' })]
    expect(filterProjects(projects, 'acme', NO_FILTERS)).toHaveLength(1)
  })
  it('filters by notes', () => {
    const projects = [makeProject({ notes: 'needs permit' }), makeProject({ notes: null })]
    expect(filterProjects(projects, 'permit', NO_FILTERS)).toHaveLength(1)
  })
  it('returns nothing when no match', () => {
    const projects = [makeProject({ title: 'Kitchen Sink' })]
    expect(filterProjects(projects, 'zzz', NO_FILTERS)).toHaveLength(0)
  })
  it('ignores leading/trailing whitespace in query', () => {
    const projects = [makeProject({ title: 'Deck' })]
    expect(filterProjects(projects, '  deck  ', NO_FILTERS)).toHaveLength(1)
  })
  it('returns all projects for empty query', () => {
    const projects = [makeProject(), makeProject()]
    expect(filterProjects(projects, '   ', NO_FILTERS)).toHaveLength(2)
  })
})

describe('status filter', () => {
  it('keeps only projects with matching status', () => {
    const projects = [
      makeProject({ status: 'Backlog' }),
      makeProject({ status: 'Done' }),
      makeProject({ status: 'In Progress' }),
    ]
    const result = filterProjects(projects, '', { ...NO_FILTERS, statuses: ['Backlog'] })
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('Backlog')
  })
  it('supports multiple statuses', () => {
    const projects = [
      makeProject({ status: 'Backlog' }),
      makeProject({ status: 'Done' }),
      makeProject({ status: 'In Progress' }),
    ]
    const result = filterProjects(projects, '', { ...NO_FILTERS, statuses: ['Backlog', 'Done'] })
    expect(result).toHaveLength(2)
  })
})

describe('priority filter', () => {
  it('keeps only projects with matching priority', () => {
    const projects = [makeProject({ priority: 'High' }), makeProject({ priority: 'Low' })]
    const result = filterProjects(projects, '', { ...NO_FILTERS, priorities: ['High'] })
    expect(result).toHaveLength(1)
    expect(result[0].priority).toBe('High')
  })
})

describe('tag filter', () => {
  it('keeps projects that have ALL required tags', () => {
    const projects = [
      makeProject({ project_tags: [{ tag_id: 'a' }, { tag_id: 'b' }] }),
      makeProject({ project_tags: [{ tag_id: 'a' }] }),
      makeProject({ project_tags: [] }),
    ]
    const result = filterProjects(projects, '', { ...NO_FILTERS, tagIds: ['a', 'b'] })
    expect(result).toHaveLength(1)
  })
  it('keeps projects with at least the required tag', () => {
    const projects = [
      makeProject({ project_tags: [{ tag_id: 'a' }] }),
      makeProject({ project_tags: [{ tag_id: 'b' }] }),
    ]
    const result = filterProjects(projects, '', { ...NO_FILTERS, tagIds: ['a'] })
    expect(result).toHaveLength(1)
  })
  it('excludes projects with no project_tags field', () => {
    const p = makeProject()
    delete p.project_tags
    const result = filterProjects([p], '', { ...NO_FILTERS, tagIds: ['a'] })
    expect(result).toHaveLength(0)
  })
})

describe('overdue filter', () => {
  it('keeps projects with a past due_date that are not Done', () => {
    const projects = [
      makeProject({ due_date: '2020-01-01', status: 'Backlog' }),
      makeProject({ due_date: '2020-01-01', status: 'Done' }),
      makeProject({ due_date: null, status: 'Backlog' }),
    ]
    const result = filterProjects(projects, '', { ...NO_FILTERS, overdue: true })
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('Backlog')
  })
  it('excludes future-dated projects', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    const projects = [makeProject({ due_date: future.toISOString().split('T')[0], status: 'Backlog' })]
    const result = filterProjects(projects, '', { ...NO_FILTERS, overdue: true })
    expect(result).toHaveLength(0)
  })
})

describe('hideDone filter', () => {
  it('excludes Done projects', () => {
    const projects = [
      makeProject({ status: 'Done' }),
      makeProject({ status: 'Backlog' }),
      makeProject({ status: 'In Progress' }),
    ]
    const result = filterProjects(projects, '', { ...NO_FILTERS, hideDone: true })
    expect(result).toHaveLength(2)
    expect(result.every(p => p.status !== 'Done')).toBe(true)
  })
})

describe('combined filters', () => {
  it('applies search and status together', () => {
    const projects = [
      makeProject({ title: 'Deck', status: 'Backlog' }),
      makeProject({ title: 'Deck', status: 'Done' }),
      makeProject({ title: 'Kitchen', status: 'Backlog' }),
    ]
    const result = filterProjects(projects, 'deck', { ...NO_FILTERS, statuses: ['Backlog'] })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Deck')
    expect(result[0].status).toBe('Backlog')
  })
  it('returns empty when filters eliminate everything', () => {
    const projects = [makeProject({ status: 'Done', priority: 'Low' })]
    const result = filterProjects(projects, '', { ...NO_FILTERS, statuses: ['Backlog'], priorities: ['High'] })
    expect(result).toHaveLength(0)
  })
})
