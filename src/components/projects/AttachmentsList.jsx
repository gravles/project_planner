import { useRef } from 'react'
import { useProjectAttachments, useUploadAttachment, useDeleteAttachment } from '../../hooks/useAttachments'

function fileIcon(mimeType) {
  if (!mimeType) return '📄'
  if (mimeType === 'application/pdf') return '📋'
  if (mimeType.startsWith('image/')) return '🖼'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return '📊'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('tar')) return '🗜'
  return '📄'
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AttachmentsList({ projectId }) {
  const inputRef = useRef(null)
  const { data: attachments = [], isLoading } = useProjectAttachments(projectId)
  const upload = useUploadAttachment()
  const remove = useDeleteAttachment()

  function handleFiles(files) {
    Array.from(files).forEach(file =>
      upload.mutate({ projectId, file })
    )
  }

  function handleDrop(e) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Files</p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="text-xs text-accent hover:text-amber-300 disabled:opacity-50 transition-colors"
        >
          {upload.isPending ? 'Uploading…' : '+ Attach'}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="space-y-1"
      >
        {isLoading && (
          <p className="text-xs text-text-muted py-2">Loading…</p>
        )}

        {!isLoading && attachments.length === 0 && (
          <div
            onClick={() => inputRef.current?.click()}
            className="border border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-accent/50 transition-colors"
          >
            <p className="text-xs text-text-muted">Drop files here or click to attach</p>
            <p className="text-[10px] text-text-muted/60 mt-0.5">Quotes, permits, invoices — up to 25 MB each</p>
          </div>
        )}

        {attachments.map(attachment => (
          <div
            key={attachment.id}
            className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-bg-elevated transition-colors"
          >
            <span className="text-base shrink-0">{fileIcon(attachment.mime_type)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-primary truncate">{attachment.file_name}</p>
              {attachment.file_size && (
                <p className="text-[10px] text-text-muted">{formatSize(attachment.file_size)}</p>
              )}
            </div>
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              download={attachment.file_name}
              className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent transition-all text-xs px-1"
              title="Download"
            >
              ↓
            </a>
            <button
              onClick={() => remove.mutate({ id: attachment.id, storagePath: attachment.storage_path, projectId })}
              className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all text-xs px-1"
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}

        {attachments.length > 0 && (
          <div
            onClick={() => inputRef.current?.click()}
            className="text-[11px] text-text-muted/60 hover:text-text-muted text-center pt-1 cursor-pointer transition-colors"
          >
            + attach another file
          </div>
        )}
      </div>
    </div>
  )
}
