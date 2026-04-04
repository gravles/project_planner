import { useState } from 'react'
import { cn, formatDate, isOverdue, PRIORITY_COLORS, STATUS_COLORS } from '../../lib/utils'
import BulkActionBar from './BulkActionBar'
import { useUpdateProject, useDeleteProject } from '../../hooks/useProjects'

export default function ListView({ projects, onOpen }) {
  const [sort, setSort] = useState({ key: 'created_at', dir: 'desc' })
  const [selectedIds, setSelectedIds] = useState(new Set())
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  function toggleSort(key) {
    setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))
  }

  const sorted = [...projects].sort((a, b) => {
    let av = a[sort.key]
    let bv = b[sort.key]
    if (sort.key === 'due_date') { av = av ? new Date(av) : null; bv = bv ? new Date(bv) : null }
    if (sort.key === 'estimate_cad') { av = Number(av ?? 0); bv = Number(bv ?? 0) }
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (av < bv) return sort.dir === 'asc' ? -1 : 1
    if (av > bv) return sort.dir === 'asc' ? 1 : -1
    return 0
  })

  const allChecked = sorted.length > 0 && sorted.every(p => selectedIds.has(p.id))

  function toggleAll() {
    if (allChecked) setSelectedIds(new Set())
    else setSelectedIds(new Set(sorted.map(p => p.id)))
  }

  function toggleOne(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleBulkStatus(status) {
    await Promise.all([...selectedIds].map(id => updateProject.mutateAsync({ id, status })))
    setSelectedIds(new Set())
  }

  async function handleBulkPriority(priority) {
    await Promise.all([...selectedIds].map(id => updateProject.mutateAsync({ id, priority })))
    setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    await Promise.all([...selectedIds].map(id => deleteProject.mutateAsync(id)))
    setSelectedIds(new Set())
  }

  function SortIcon({ k }) {
    if (sort.key !== k) return <span className="opacity-25 text-[10px]">↕</span>
    return <span className="text-accent text-[10px]">{sort.dir === 'asc' ? '↑' : '↓'}</span>
  }

  function TH({ k, label, className = '' }) {
    return (
      <th
        className={cn(
          'px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-text-secondary whitespace-nowrap',
          className,
        )}
        onClick={() => toggleSort(k)}
      >
        {label} <SortIcon k={k} />
      </th>
    )
  }

  return (
    <div className="px-6 pb-6 overflow-auto flex-1 scrollbar-thin">
      <table className="w-full border-collapse mt-5">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-3 w-8">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
                className="w-3.5 h-3.5 rounded border-border accent-accent cursor-pointer"
              />
            </th>
            <TH k="title" label="Project" />
            <TH k="status" label="Status" />
            <TH k="priority" label="Priority" />
            <TH k="room" label="Room" />
            <TH k="due_date" label="Due" />
            <TH k="estimate_cad" label="Estimate" className="text-right" />
            <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
              Vendor
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(project => {
            const overdue = isOverdue(project.due_date) && project.status !== 'Done'
            const spent = project.spend_entries?.reduce((s, e) => s + Number(e.amount_cad), 0) ?? 0
            const estimate = Number(project.estimate_cad ?? 0)
            const subtaskTotal = project.subtasks?.length ?? 0
            const subtaskDone = project.subtasks?.filter(s => s.done).length ?? 0
            const checked = selectedIds.has(project.id)
            return (
              <tr
                key={project.id}
                className={cn(
                  'border-b border-border/40 cursor-pointer hover:bg-bg-elevated transition-colors group',
                  checked && 'bg-bg-elevated',
                )}
              >
                <td className="px-3 py-3 w-8" onClick={e => { e.stopPropagation(); toggleOne(project.id) }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOne(project.id)}
                    className="w-3.5 h-3.5 rounded border-border accent-accent cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3" onClick={() => onOpen(project.id)}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    {project.properties && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: project.properties.color }}
                      />
                    )}
                    <span className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate max-w-xs">
                      {project.title}
                    </span>
                    {subtaskTotal > 0 && (
                      <span className={cn('text-[11px] shrink-0', subtaskDone === subtaskTotal ? 'text-success' : 'text-text-muted')}>
                        {subtaskDone}/{subtaskTotal}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3" onClick={() => onOpen(project.id)}>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[project.status])}>
                    {project.status}
                  </span>
                </td>
                <td className="px-4 py-3" onClick={() => onOpen(project.id)}>
                  <span className={cn('text-xs font-semibold', PRIORITY_COLORS[project.priority])}>
                    {project.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap" onClick={() => onOpen(project.id)}>{project.room}</td>
                <td className="px-4 py-3 text-xs whitespace-nowrap" onClick={() => onOpen(project.id)}>
                  {project.due_date ? (
                    <span className={overdue ? 'text-danger font-medium' : 'text-text-muted'}>
                      {overdue ? '⚠ ' : ''}{formatDate(project.due_date)}
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-right whitespace-nowrap" onClick={() => onOpen(project.id)}>
                  {estimate > 0 ? (
                    <span className={spent > estimate ? 'text-danger' : 'text-text-secondary'}>
                      {spent > 0 ? `$${spent.toLocaleString()} / ` : ''}${estimate.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-text-muted" onClick={() => onOpen(project.id)}>{project.vendor || '—'}</td>
              </tr>
            )
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-16 text-center text-text-muted text-sm">
                No projects yet — hit <kbd className="bg-bg-elevated border border-border px-1.5 py-0.5 rounded text-xs">N</kbd> to create one.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <BulkActionBar
        selectedCount={selectedIds.size}
        onStatusChange={handleBulkStatus}
        onPriorityChange={handleBulkPriority}
        onDelete={handleBulkDelete}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  )
}
