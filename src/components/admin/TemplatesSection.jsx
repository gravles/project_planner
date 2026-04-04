import { useState } from 'react'
import { useTemplates, useDeleteTemplate } from '../../hooks/useTemplates'
import { useCreateProject } from '../../hooks/useProjects'
import { toast } from '../../stores/toastStore'
import NewProjectModal from '../projects/NewProjectModal'
import { cn } from '../../lib/utils'

export default function TemplatesSection() {
  const { data: templates = [] } = useTemplates()
  const deleteTemplate = useDeleteTemplate()
  const createProject = useCreateProject()

  const [loadTemplate, setLoadTemplate] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  async function handleDelete(id) {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    await deleteTemplate.mutateAsync(id)
    setConfirmDeleteId(null)
  }

  if (templates.length === 0) {
    return (
      <div className="bg-bg-surface border border-border rounded-2xl p-5">
        <p className="text-sm text-text-muted">
          No templates yet. Open any project in the detail panel and click <strong className="text-text-secondary">Save as template</strong> to create one.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-bg-surface border border-border rounded-2xl p-5">
      <div className="space-y-1">
        {templates.map(template => (
          <div
            key={template.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-bg-elevated transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {template.template_name || template.title}
              </p>
              <p className="text-xs text-text-muted">
                {template.room} · {template.priority}
                {template.subtasks?.length > 0 && ` · ${template.subtasks.length} subtasks`}
              </p>
            </div>
            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setLoadTemplate(template)}
                className="text-xs px-2.5 py-1 rounded-lg text-accent hover:bg-accent/10 transition-colors font-medium"
              >
                Use
              </button>
              <button
                onClick={() => handleDelete(template.id)}
                className={cn(
                  'text-xs px-2 py-1 rounded-lg transition-colors',
                  confirmDeleteId === template.id
                    ? 'bg-danger text-white'
                    : 'text-danger hover:bg-danger/10',
                )}
              >
                {confirmDeleteId === template.id ? 'Confirm' : 'Delete'}
              </button>
              {confirmDeleteId === template.id && (
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-xs text-text-muted hover:text-text-secondary"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {loadTemplate && (
        <NewProjectModal
          open
          onClose={() => setLoadTemplate(null)}
          onCreate={async (data) => {
            await createProject.mutateAsync(data)
            setLoadTemplate(null)
          }}
          initialData={{
            title: loadTemplate.title,
            property_id: loadTemplate.property_id ?? '',
            room: loadTemplate.room,
            status: 'Backlog',
            priority: loadTemplate.priority,
            estimate_cad: loadTemplate.estimate_cad ? String(loadTemplate.estimate_cad) : '',
            vendor: loadTemplate.vendor ?? '',
            notes: loadTemplate.notes ?? '',
            subtasks: loadTemplate.subtasks?.map(s => ({ text: s.text })) ?? [],
          }}
        />
      )}
    </div>
  )
}
