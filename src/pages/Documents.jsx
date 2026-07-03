import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AppShell from '../components/layout/AppShell'
import { useDocuments, useCreateDocument, useDeleteDocument } from '../hooks/useDocuments'
import { useProperties } from '../hooks/useProperties'
import { useProjects } from '../hooks/useProjects'
import { parseDocument } from '../lib/anthropic'
import { Skeleton } from '../components/ui/Skeleton'
import { cn, formatDate } from '../lib/utils'
import { toast } from '../stores/toastStore'

const DOC_TYPES = ['permit', 'warranty', 'insurance', 'manual', 'quote', 'invoice', 'other']
const TYPE_ICONS = {
  permit: '📋', warranty: '🛡️', insurance: '☂️', manual: '📖',
  quote: '💬', invoice: '🧾', other: '📄',
}
const AI_PARSE_MAX_BYTES = 1024 * 1024 // proxy caps request size; larger files skip extraction

const inputCls = 'w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent'

function daysUntil(dateIso) {
  return Math.ceil((new Date(dateIso) - new Date()) / 86400000)
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function UploadModal({ open, onClose, file, prefill, parsing, properties, projects, onSave }) {
  const [form, setForm] = useState({ title: '', doc_type: 'other', expires_on: '', vendor: '', notes: '', property_id: '', project_id: '' })
  const [prevPrefill, setPrevPrefill] = useState(prefill)
  if (prevPrefill !== prefill) {
    setPrevPrefill(prefill)
    if (prefill) {
      setForm(f => ({
        ...f,
        title: prefill.title ?? f.title,
        doc_type: DOC_TYPES.includes(prefill.doc_type) ? prefill.doc_type : 'other',
        expires_on: prefill.expires_on ?? '',
        vendor: prefill.vendor ?? '',
        notes: prefill.notes ?? '',
      }))
    } else {
      setForm({ title: '', doc_type: 'other', expires_on: '', vendor: '', notes: '', property_id: '', project_id: '' })
    }
  }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave({
      file,
      title: form.title.trim(),
      doc_type: form.doc_type,
      expires_on: form.expires_on || null,
      vendor: form.vendor?.trim() || null,
      notes: form.notes?.trim() || null,
      property_id: form.property_id || null,
      project_id: form.project_id || null,
    })
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ duration: 0.16 }}
            role="dialog" aria-label="Save document"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 pointer-events-none"
          >
            <div className="bg-bg-surface sm:border border-border sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl pointer-events-auto scrollbar-thin">
              <div className="px-6 py-5 border-b border-border sticky top-0 bg-bg-surface z-10">
                <h2 className="font-display text-base font-bold text-text-primary">Save Document</h2>
                <p className="text-xs text-text-muted mt-1 truncate">
                  {file?.name}
                  {parsing && <span className="text-accent"> · ✨ reading document…</span>}
                </p>
              </div>
              <form onSubmit={submit} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Title *</label>
                  <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                    placeholder={parsing ? 'AI is reading the document…' : 'e.g. Furnace warranty'}
                    className={inputCls} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Type</label>
                    <select value={form.doc_type} onChange={e => set('doc_type', e.target.value)} className={inputCls}>
                      {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Expires / renews</label>
                    <input type="date" value={form.expires_on} onChange={e => set('expires_on', e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Property</label>
                    <select value={form.property_id} onChange={e => set('property_id', e.target.value)} className={inputCls}>
                      <option value="">— None —</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Project</label>
                    <select value={form.project_id} onChange={e => set('project_id', e.target.value)} className={inputCls}>
                      <option value="">— None —</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Vendor / issuer</label>
                  <input type="text" value={form.vendor} onChange={e => set('vendor', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Notes</label>
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base">
                    Save Document
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function DocCard({ doc, onDelete }) {
  const days = doc.expires_on ? daysUntil(doc.expires_on) : null
  const expiryTone = days == null ? '' : days < 0 ? 'text-danger' : days <= 60 ? 'text-accent' : 'text-text-muted'
  return (
    <div className="bg-bg-surface border border-border rounded-xl p-4 flex flex-col gap-2 group">
      <div className="flex items-start justify-between gap-2">
        <a href={doc.url ?? '#'} target="_blank" rel="noreferrer"
          className="flex items-start gap-2.5 min-w-0 hover:opacity-80 transition-opacity">
          <span className="text-lg leading-none mt-0.5">{TYPE_ICONS[doc.doc_type] ?? '📄'}</span>
          <span>
            <span className="block text-sm font-medium text-text-primary leading-snug">{doc.title}</span>
            <span className="block text-[11px] text-text-muted mt-0.5">
              {doc.doc_type}
              {doc.vendor && ` · ${doc.vendor}`}
              {doc.projects?.title && ` · ${doc.projects.title}`}
            </span>
          </span>
        </a>
        <button
          onClick={() => { if (confirm(`Delete "${doc.title}"?`)) onDelete(doc) }}
          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger text-xs transition-opacity shrink-0"
        >
          ✕
        </button>
      </div>
      {doc.expires_on && (
        <p className={cn('text-[11px]', expiryTone)}>
          {days < 0 ? `Expired ${formatDate(doc.expires_on)}` : `Expires ${formatDate(doc.expires_on)} (${days}d)`}
        </p>
      )}
      {doc.notes && <p className="text-[11px] text-text-muted line-clamp-2">{doc.notes}</p>}
    </div>
  )
}

export default function Documents() {
  const { data: docs = [], isLoading } = useDocuments()
  const { data: properties = [] } = useProperties()
  const { data: projects = [] } = useProjects()
  const createDoc = useCreateDocument()
  const deleteDoc = useDeleteDocument()

  const fileRef = useRef(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [prefill, setPrefill] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [typeFilter, setTypeFilter] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPendingFile(file)
    setPrefill(null)
    // AI prefill — best effort; failure degrades to a blank manual form
    const canParse = (file.type.startsWith('image/') || file.type === 'application/pdf') && file.size <= AI_PARSE_MAX_BYTES
    if (canParse) {
      setParsing(true)
      try {
        const base64 = await fileToBase64(file)
        const parsed = await parseDocument(base64, file.type)
        setPrefill(parsed)
      } catch {
        toast.info('Could not auto-read the document — fill in the details manually.')
      } finally {
        setParsing(false)
      }
    }
  }

  const expiring = useMemo(() =>
    docs.filter(d => d.expires_on && daysUntil(d.expires_on) <= 60)
      .sort((a, b) => a.expires_on.localeCompare(b.expires_on)),
  [docs])

  const groups = useMemo(() => {
    const filtered = typeFilter ? docs.filter(d => d.doc_type === typeFilter) : docs
    const map = new Map()
    for (const d of filtered) {
      const key = d.properties?.id ?? 'none'
      if (!map.has(key)) map.set(key, { property: d.properties, docs: [] })
      map.get(key).docs.push(d)
    }
    return [...map.values()].sort((a, b) => (a.property?.name ?? 'zz').localeCompare(b.property?.name ?? 'zz'))
  }, [docs, typeFilter])

  return (
    <AppShell>
      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-4xl space-y-6 overflow-y-auto flex-1 scrollbar-thin">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold text-text-primary">Documents</h1>
            <p className="text-xs text-text-muted mt-0.5">
              Permits, warranties, insurance, manuals — with expiry reminders.
            </p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base"
          >
            + Upload
          </button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
        </div>

        {/* Type filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {DOC_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? null : t)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                typeFilter === t
                  ? 'bg-accent/10 border-accent/40 text-accent'
                  : 'border-border text-text-muted hover:text-text-secondary',
              )}
            >
              {TYPE_ICONS[t]} {t}
            </button>
          ))}
        </div>

        {/* Expiring soon */}
        {expiring.length > 0 && !typeFilter && (
          <div className="bg-accent/5 border border-accent/25 rounded-2xl px-5 py-4">
            <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-3">Expiring soon</p>
            <div className="space-y-2">
              {expiring.map(d => {
                const days = daysUntil(d.expires_on)
                return (
                  <a key={d.id} href={d.url ?? '#'} target="_blank" rel="noreferrer"
                    className="flex items-center justify-between gap-3 hover:opacity-80 transition-opacity">
                    <span className="text-sm text-text-primary truncate">
                      {TYPE_ICONS[d.doc_type]} {d.title}
                      {d.properties?.name && <span className="text-text-muted"> · {d.properties.name}</span>}
                    </span>
                    <span className={cn('text-xs shrink-0', days < 0 ? 'text-danger' : 'text-accent')}>
                      {days < 0 ? `expired ${-days}d ago` : `${days}d left`}
                    </span>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        )}

        {!isLoading && docs.length === 0 && (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🗂️</p>
            <p className="text-sm text-text-secondary">No documents yet.</p>
            <p className="text-xs text-text-muted mt-1">
              Upload a warranty card, permit, or insurance doc — AI fills in the details.
            </p>
          </div>
        )}

        {groups.map(({ property, docs: groupDocs }) => (
          <div key={property?.id ?? 'none'}>
            <div className="flex items-center gap-2 mb-3">
              {property?.color && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: property.color }} />}
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                {property?.name ?? 'Unfiled'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groupDocs.map(d => (
                <DocCard key={d.id} doc={d} onDelete={doc => deleteDoc.mutate({ id: doc.id, storagePath: doc.storage_path })} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <UploadModal
        open={!!pendingFile}
        onClose={() => { setPendingFile(null); setPrefill(null) }}
        file={pendingFile}
        prefill={prefill}
        parsing={parsing}
        properties={properties}
        projects={projects}
        onSave={fields => createDoc.mutate(fields)}
      />
    </AppShell>
  )
}
