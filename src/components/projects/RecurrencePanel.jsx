import { useState } from 'react'
import { addWeeks, addMonths, addYears, format } from 'date-fns'
import { useCreateProject } from '../../hooks/useProjects'
import { useUIStore } from '../../stores/uiStore'
import { toast } from '../../stores/toastStore'

const OPTIONS = [
  { value: 'none',      label: 'Does not repeat' },
  { value: 'weekly',    label: 'Weekly' },
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual',    label: 'Annually' },
]

function getNextDate(date, recurrence) {
  const base = date ? new Date(date + 'T12:00:00') : new Date()
  switch (recurrence) {
    case 'weekly':    return format(addWeeks(base, 1), 'yyyy-MM-dd')
    case 'monthly':   return format(addMonths(base, 1), 'yyyy-MM-dd')
    case 'quarterly': return format(addMonths(base, 3), 'yyyy-MM-dd')
    case 'annual':    return format(addYears(base, 1), 'yyyy-MM-dd')
    default:          return null
  }
}

export default function RecurrencePanel({ project, onSave }) {
  const createProject = useCreateProject()
  const { openDetail } = useUIStore()
  const [creating, setCreating] = useState(false)

  const recurrence = project.recurrence ?? 'none'

  async function handleCreateNext() {
    setCreating(true)
    try {
      const nextDue = getNextDate(project.due_date, recurrence)
      const newProject = await createProject.mutateAsync({
        project: {
          title: project.title,
          property_id: project.property_id,
          room: project.room,
          status: 'Backlog',
          priority: project.priority,
          estimate_cad: project.estimate_cad,
          vendor: project.vendor,
          notes: project.notes,
          due_date: nextDue,
          recurrence: project.recurrence,
          recurrence_parent_id: project.id,
        },
        subtasks: project.subtasks?.map(s => ({ text: s.text })) ?? [],
      })
      openDetail(newProject.id)
    } catch {
      toast.error('Failed to create next occurrence')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-2">
      <select
        value={recurrence}
        onChange={e => onSave(e.target.value)}
        className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
      >
        {OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {recurrence !== 'none' && (
        <div className="space-y-1.5">
          {project.due_date && (
            <p className="text-xs text-text-muted">
              Next occurrence: <span className="text-text-secondary">{getNextDate(project.due_date, recurrence)}</span>
            </p>
          )}
          <button
            onClick={handleCreateNext}
            disabled={creating}
            className="w-full py-1.5 rounded-lg text-sm text-text-secondary border border-border hover:border-border-hover hover:text-text-primary transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create next occurrence →'}
          </button>
        </div>
      )}

      {project.recurrence_parent_id && (
        <button
          onClick={() => openDetail(project.recurrence_parent_id)}
          className="text-xs text-text-muted hover:text-accent transition-colors"
        >
          ↑ View parent project
        </button>
      )}
    </div>
  )
}
