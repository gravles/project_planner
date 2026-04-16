import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { cn, STATUS_COLORS, formatDate } from '../lib/utils'

export default function ShareView() {
  const { token } = useParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/share?token=${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setProject(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-text-primary font-semibold mb-2">Link not found</p>
        <p className="text-text-muted text-sm">This share link may have been revoked or doesn't exist.</p>
      </div>
    </div>
  )

  const totalSpent = project.spend_entries?.reduce((s, e) => s + Number(e.amount_cad), 0) ?? 0
  const subtasksDone = project.subtasks?.filter(s => s.done).length ?? 0
  const subtasksTotal = project.subtasks?.length ?? 0
  const estimate = Number(project.estimate_cad ?? 0)

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <div className="max-w-xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            {project.properties && (
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.properties.color }} />
            )}
            <span className="text-xs text-text-muted">{project.properties?.name ?? ''}</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-text-primary">{project.title}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_COLORS[project.status])}>
              {project.status}
            </span>
            <span className="text-xs text-text-muted">{project.priority} priority</span>
            {project.room && <span className="text-xs text-text-muted">· {project.room}</span>}
            {project.vendor && <span className="text-xs text-text-muted">· {project.vendor}</span>}
            {project.due_date && <span className="text-xs text-text-muted">· Due {formatDate(project.due_date)}</span>}
          </div>
        </div>

        {/* Notes */}
        {project.notes && (
          <div className="bg-bg-surface border border-border rounded-2xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Notes</p>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{project.notes}</p>
          </div>
        )}

        {/* Budget */}
        {estimate > 0 && (
          <div className="bg-bg-surface border border-border rounded-2xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Budget</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Spent</span>
              <span className={cn('text-sm font-semibold', totalSpent > estimate ? 'text-danger' : 'text-text-primary')}>
                ${totalSpent.toLocaleString()}
                <span className="text-text-muted font-normal"> / ${estimate.toLocaleString()}</span>
              </span>
            </div>
            <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (totalSpent / estimate) * 100)}%`,
                  backgroundColor: totalSpent > estimate ? '#ef4444' : '#10b981',
                }}
              />
            </div>
          </div>
        )}

        {/* Subtasks */}
        {subtasksTotal > 0 && (
          <div className="bg-bg-surface border border-border rounded-2xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Steps <span className="font-normal text-text-muted">({subtasksDone}/{subtasksTotal} done)</span>
            </p>
            <div className="space-y-2.5">
              {project.subtasks?.map((task, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={cn(
                    'w-4 h-4 rounded border shrink-0 flex items-center justify-center',
                    task.done ? 'bg-success border-success' : 'border-border-hover',
                  )}>
                    {task.done && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 6 4.5 9.5 11 2.5" />
                      </svg>
                    )}
                  </div>
                  <span className={cn('text-sm', task.done ? 'text-text-muted line-through' : 'text-text-secondary')}>
                    {task.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spend log */}
        {project.spend_entries?.length > 0 && (
          <div className="bg-bg-surface border border-border rounded-2xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Spend Log</p>
            <div className="space-y-1.5">
              {project.spend_entries?.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-border/30 last:border-0 pb-1.5 last:pb-0">
                  <span className="text-sm font-semibold text-text-primary w-20 shrink-0">
                    ${Number(entry.amount_cad).toLocaleString()}
                  </span>
                  <span className="flex-1 text-xs text-text-muted truncate">{entry.note || '—'}</span>
                  <span className="text-xs text-text-muted shrink-0">{formatDate(entry.entry_date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-center text-text-muted mt-8">Project Planner · Read-only view</p>
      </div>
    </div>
  )
}
