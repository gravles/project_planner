import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useUIStore } from '../stores/uiStore'

// Keeps search + filters in the URL on the Projects page so a filtered view
// survives refresh, works with the back button, and can be shared as a link.
// URL → store once on mount; store → URL (replace) on every change after that.
export function useFilterUrlSync() {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    searchQuery, setSearchQuery,
    activeFilters, setFilters,
  } = useUIStore()
  const hydrated = useRef(false)

  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    const q = searchParams.get('q')
    if (q) setSearchQuery(q)
    const partial = {}
    const statuses = searchParams.get('status')
    if (statuses) partial.statuses = statuses.split(',')
    const priorities = searchParams.get('priority')
    if (priorities) partial.priorities = priorities.split(',')
    const tags = searchParams.get('tags')
    if (tags) partial.tagIds = tags.split(',')
    if (searchParams.get('overdue') === '1') partial.overdue = true
    if (searchParams.get('hideDone') === '1') partial.hideDone = true
    if (Object.keys(partial).length) setFilters(partial)
  }, [searchParams, setSearchQuery, setFilters])

  useEffect(() => {
    if (!hydrated.current) return
    const params = {}
    if (searchQuery) params.q = searchQuery
    if (activeFilters.statuses.length) params.status = activeFilters.statuses.join(',')
    if (activeFilters.priorities.length) params.priority = activeFilters.priorities.join(',')
    if (activeFilters.tagIds.length) params.tags = activeFilters.tagIds.join(',')
    if (activeFilters.overdue) params.overdue = '1'
    if (activeFilters.hideDone) params.hideDone = '1'
    setSearchParams(params, { replace: true })
  }, [searchQuery, activeFilters, setSearchParams])
}
