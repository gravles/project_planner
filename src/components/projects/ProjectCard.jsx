import { cn, formatDate, isOverdue, PRIORITY_COLORS } from '../../lib/utils'

export default function ProjectCard({ project, onOpen, isDragging = false }) {
  const subtaskTotal = project.subtasks?.length ?? 0
  const subtaskDone = project.subtasks?.filter(s => s.done).length ?? 0
  const spent = project.spend_entries?.reduce((s, e) => s + Number(e.amount_cad), 0) ?? 0
  const estimate = Number(project.estimate_cad)
  const overdue = isOverdue(project.due_date) && project.status !== 'Done'

  return (
    <div
      onClick={onOpen}
      className={cn(
        'bg-bg-elevated border border-border rounded-xl p-3.5 cursor-pointer hover:border-border-hover transition-all select-none',
        isDragging && 'opacity-0 pointer-events-none',
      )}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {project.properties && (
            <span
              className="w-2 h-2 rounded-full shrink-0 mt-0.5"
              style={{ backgroundColor: project.properties.color }}
            />
          )}
          <span className="text-sm font-medium text-text-primary leading-snug line-clamp-2">
            {project.title}
          </span>
        </div>
        <span className={cn('text-[11px] font-semibold shrink-0 mt-0.5', PRIORITY_COLORS[project.priority])}>
          {project.priority}
        </span>
      </div>

      {/* Meta badges */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
        <span className="text-[11px] text-text-muted bg-bg-base px-1.5 py-0.5 rounded-md">
          {project.room}
        </span>
        {project.vendor && (
          <span className="text-[11px] text-text-muted truncate max-w-[100px]">
            {project.vendor}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted">
        <div className="flex items-center gap-2.5">
          {subtaskTotal > 0 && (
            <span className={subtaskDone === subtaskTotal ? 'text-success' : ''}>
              ✓ {subtaskDone}/{subtaskTotal}
            </span>
          )}
          {project.due_date && (
            <span className={overdue ? 'text-danger font-medium' : ''}>
              {overdue ? '⚠ ' : ''}{formatDate(project.due_date)}
            </span>
          )}
        </div>
        {estimate > 0 && (
          <span className={spent > estimate ? 'text-danger' : ''}>
            {spent > 0 ? `$${spent.toLocaleString()} / ` : ''}${estimate.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}
