import { Link } from 'react-router-dom'
import { useProjectDocuments } from '../../hooks/useDocuments'
import { formatDate } from '../../lib/utils'

// Read-only list of vault documents linked to this project.
// Uploading/linking happens on the Documents page.
export default function ProjectDocuments({ projectId }) {
  const { data: docs = [] } = useProjectDocuments(projectId)
  if (docs.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Documents</p>
        <Link to="/documents" className="text-xs text-text-muted hover:text-accent transition-colors">
          vault →
        </Link>
      </div>
      <div className="space-y-1.5">
        {docs.map(d => (
          <a
            key={d.id}
            href={d.url ?? '#'}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <span className="truncate">📄 {d.title}</span>
            {d.expires_on && (
              <span className="text-[11px] text-text-muted shrink-0">exp {formatDate(d.expires_on)}</span>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
