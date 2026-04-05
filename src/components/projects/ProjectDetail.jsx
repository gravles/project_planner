import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  useProject,
  useUpdateProject,
  useUpdateProjectTags,
  useDeleteProject,
  useAddSubtask,
  useToggleSubtask,
  useDeleteSubtask,
  useAddSpend,
  useDeleteSpend,
} from '../../hooks/useProjects'
import { useSaveAsTemplate } from '../../hooks/useTemplates'
import { useProperties } from '../../hooks/useProperties'
import { useRoomTypes, useCreateRoomType } from '../../hooks/useAdmin'
import Combobox from '../ui/Combobox'
import TagPicker from '../ui/TagPicker'
import PhotoGallery from './PhotoGallery'
import AiBudgetEstimator from './AiBudgetEstimator'
import AiTimeEstimator from './AiTimeEstimator'
import RecurrencePanel from './RecurrencePanel'
import SharePanel from './SharePanel'
import { getProjectSuggestions, parseReceiptImage } from '../../lib/anthropic'
import { toast } from '../../stores/toastStore'
import {
  cn,
  formatDate,
  timeAgo,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_COLORS,
  PRIORITY_COLORS,
} from '../../lib/utils'

function formatHours(h) {
  const n = Number(h)
  if (n < 1) return `${Math.round(n * 60)} min`
  if (n % 1 === 0) return `${n}h`
  return `${n}h`
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function InlineInput({ value, onBlurSave, type = 'text', placeholder, className = '' }) {
  const [local, setLocal] = useState(value ?? '')
  useEffect(() => setLocal(value ?? ''), [value])
  return (
    <input
      type={type}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onBlurSave(local)}
      placeholder={placeholder}
      className={cn(
        'w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors',
        className,
      )}
    />
  )
}

function InlineTextarea({ value, onBlurSave, placeholder, rows = 3 }) {
  const [local, setLocal] = useState(value ?? '')
  useEffect(() => setLocal(value ?? ''), [value])
  return (
    <textarea
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onBlurSave(local)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none transition-colors"
    />
  )
}

export default function ProjectDetail({ projectId, onClose }) {
  const { data: project, isLoading } = useProject(projectId)
  const { data: properties = [] } = useProperties()
  const { data: roomTypes = [] } = useRoomTypes()
  const createRoomType = useCreateRoomType()
  const updateProject = useUpdateProject()
  const updateProjectTags = useUpdateProjectTags()
  const saveAsTemplate = useSaveAsTemplate()
  const deleteProject = useDeleteProject()
  const addSubtask = useAddSubtask()
  const toggleSubtask = useToggleSubtask()
  const deleteSubtask = useDeleteSubtask()
  const addSpend = useAddSpend()
  const deleteSpend = useDeleteSpend()

  const [newSubtaskText, setNewSubtaskText] = useState('')
  const [spendForm, setSpendForm] = useState({ amount: '', note: '', date: format(new Date(), 'yyyy-MM-dd') })
  const [spendOpen, setSpendOpen] = useState(false)
  const [receiptScanning, setReceiptScanning] = useState(false)
  const receiptInputRef = useRef(null)
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const subtaskInputRef = useRef(null)

  function save(field, value) {
    updateProject.mutate({ id: projectId, [field]: value || null })
  }

  function saveSelect(field, value) {
    updateProject.mutate({ id: projectId, [field]: value })
  }

  async function handleAddSubtask(e) {
    e?.preventDefault()
    if (!newSubtaskText.trim()) return
    const position = project?.subtasks?.length ?? 0
    await addSubtask.mutateAsync({ projectId, text: newSubtaskText.trim(), position })
    setNewSubtaskText('')
    subtaskInputRef.current?.focus()
  }

  async function handleAddSpend(e) {
    e.preventDefault()
    if (!spendForm.amount || Number(spendForm.amount) <= 0) return
    await addSpend.mutateAsync({
      projectId,
      amount_cad: Number(spendForm.amount),
      note: spendForm.note || null,
      entry_date: spendForm.date,
    })
    setSpendForm({ amount: '', note: '', date: format(new Date(), 'yyyy-MM-dd') })
    setSpendOpen(false)
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    await deleteProject.mutateAsync(projectId)
    onClose()
  }

  async function handleReceiptScan(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptScanning(true)
    setSpendOpen(true)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const result = await parseReceiptImage(base64, file.type)
      setSpendForm(f => ({
        amount: result.amount_cad ? String(result.amount_cad) : f.amount,
        note:   result.note  ?? f.note,
        date:   result.date  ?? f.date,
      }))
    } catch {
      toast.error('Could not read receipt. Try a clearer photo.')
    } finally {
      setReceiptScanning(false)
      // Reset input so the same file can be re-scanned if needed
      if (receiptInputRef.current) receiptInputRef.current.value = ''
    }
  }

  async function fetchSuggestions() {
    if (!project) return
    setAiLoading(true)
    setAiSuggestions(null)
    try {
      const suggestions = await getProjectSuggestions(project)
      setAiSuggestions(suggestions)
    } catch {
      setAiSuggestions(['Could not load suggestions. Check your API key.'])
    } finally {
      setAiLoading(false)
    }
  }

  const spent = project?.spend_entries?.reduce((s, e) => s + Number(e.amount_cad), 0) ?? 0
  const estimate = Number(project?.estimate_cad ?? 0)
  const subtaskTotal = project?.subtasks?.length ?? 0
  const subtaskDone = project?.subtasks?.filter(s => s.done).length ?? 0

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-20 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        className="fixed right-0 top-0 h-full w-full sm:max-w-[460px] z-30 bg-bg-surface sm:border-l border-border flex flex-col shadow-2xl"
      >
        {isLoading || !project ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-start gap-3">
                {project.properties && (
                  <span
                    className="w-3 h-3 rounded-full shrink-0 mt-1"
                    style={{ backgroundColor: project.properties.color }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <InlineInput
                    value={project.title}
                    onBlurSave={v => v.trim() && save('title', v.trim())}
                    placeholder="Project title"
                    className="text-base font-semibold border-transparent hover:border-border bg-transparent px-0 py-0.5 rounded-none"
                  />
                  <p className="text-xs text-text-muted mt-0.5">{project.properties?.name ?? 'No property'}</p>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 text-text-muted hover:text-text-primary transition-colors p-1"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Status / Priority inline */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <select
                  value={project.status}
                  onChange={e => saveSelect('status', e.target.value)}
                  className={cn('text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent', STATUS_COLORS[project.status])}
                >
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
                <select
                  value={project.priority}
                  onChange={e => saveSelect('priority', e.target.value)}
                  className={cn('text-xs font-semibold bg-bg-elevated border border-border rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent', PRIORITY_COLORS[project.priority])}
                >
                  {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                </select>
                <select
                  value={project.property_id ?? ''}
                  onChange={e => saveSelect('property_id', e.target.value || null)}
                  className="text-xs bg-bg-elevated border border-border rounded-lg px-2 py-1 text-text-secondary cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">No property</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-5">

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Room">
                  <Combobox
                    value={project.room}
                    onChange={v => saveSelect('room', v)}
                    options={roomTypes.map(r => r.name)}
                    onCreate={name => createRoomType.mutateAsync(name)}
                    placeholder="Select room…"
                  />
                </Field>
                <Field label="Due Date">
                  <InlineInput
                    type="date"
                    value={project.due_date ?? ''}
                    onBlurSave={v => save('due_date', v)}
                  />
                </Field>
                <Field label="Estimate (CAD)">
                  <InlineInput
                    type="number"
                    value={project.estimate_cad ? String(project.estimate_cad) : ''}
                    onBlurSave={v => updateProject.mutate({ id: projectId, estimate_cad: v ? Number(v) : 0 })}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Vendor">
                  <InlineInput
                    value={project.vendor ?? ''}
                    onBlurSave={v => save('vendor', v)}
                    placeholder="—"
                  />
                </Field>
              </div>

              <Field label="Notes">
                <InlineTextarea
                  value={project.notes ?? ''}
                  onBlurSave={v => save('notes', v)}
                  placeholder="Add notes…"
                  rows={3}
                />
              </Field>

              {/* Tags */}
              <Field label="Tags">
                <TagPicker
                  selectedIds={(project.project_tags ?? []).map(pt => pt.tag_id)}
                  onChange={ids => updateProjectTags.mutate({ projectId, tagIds: ids })}
                />
              </Field>

              {/* ── AI Estimators ── */}
              <AiBudgetEstimator projectId={projectId} projectTitle={project.title} />
              <AiTimeEstimator projectId={projectId} projectTitle={project.title} />

              {/* ── Budget + Time summary ── */}
              {(estimate > 0 || project.time_estimate_hours) && (
                <div className="bg-bg-elevated rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                  {estimate > 0 && (
                    <div>
                      <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-0.5">Budget</p>
                      <p className={cn('text-lg font-bold font-display', spent > estimate ? 'text-danger' : 'text-text-primary')}>
                        ${spent.toLocaleString()} <span className="text-sm font-normal text-text-muted">/ ${estimate.toLocaleString()}</span>
                      </p>
                    </div>
                  )}
                  {project.time_estimate_hours && (
                    <div className={estimate > 0 ? 'text-right' : ''}>
                      <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-0.5">Est. Time</p>
                      <p className="text-lg font-bold font-display text-text-primary">
                        {formatHours(project.time_estimate_hours)}
                      </p>
                    </div>
                  )}
                  {estimate > 0 && !project.time_estimate_hours && (
                    <div className="text-right">
                      <p className="text-[11px] text-text-muted mb-1">
                        {spent > estimate ? 'Over by' : 'Remaining'}
                      </p>
                      <p className={cn('text-sm font-semibold', spent > estimate ? 'text-danger' : 'text-success')}>
                        ${Math.abs(estimate - spent).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Subtasks ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                    Subtasks {subtaskTotal > 0 && <span className="text-text-muted">({subtaskDone}/{subtaskTotal})</span>}
                  </p>
                </div>
                <div className="space-y-1 mb-2">
                  {project.subtasks?.map(task => (
                    <div key={task.id} className="flex items-center gap-2.5 group/task py-1">
                      <button
                        onClick={() => toggleSubtask.mutate({ id: task.id, done: !task.done, projectId })}
                        className={cn(
                          'w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors',
                          task.done
                            ? 'bg-success border-success text-bg-base'
                            : 'border-border-hover hover:border-accent',
                        )}
                      >
                        {task.done && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1 6 4.5 9.5 11 2.5" />
                          </svg>
                        )}
                      </button>
                      <span className={cn('flex-1 text-sm', task.done ? 'text-text-muted line-through' : 'text-text-secondary')}>
                        {task.text}
                      </span>
                      <button
                        onClick={() => deleteSubtask.mutate({ id: task.id, projectId })}
                        className="opacity-0 group-hover/task:opacity-100 text-text-muted hover:text-danger transition-all text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <input
                    ref={subtaskInputRef}
                    value={newSubtaskText}
                    onChange={e => setNewSubtaskText(e.target.value)}
                    placeholder="Add subtask…"
                    className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg text-sm bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors"
                  >
                    Add
                  </button>
                </form>
              </div>

              {/* ── Spend Log ── */}
              <div>
                {/* Hidden file input — opens camera on mobile */}
                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleReceiptScan}
                />

                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Spend Log</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => receiptInputRef.current?.click()}
                      disabled={receiptScanning}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
                      title="Scan a receipt"
                    >
                      {receiptScanning ? (
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" /></svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      )}
                      {receiptScanning ? 'Scanning…' : 'Scan receipt'}
                    </button>
                    <span className="text-border">·</span>
                    <button
                      onClick={() => setSpendOpen(o => !o)}
                      className="text-xs text-accent hover:text-amber-300 transition-colors"
                    >
                      {spendOpen ? '— cancel' : '+ Add entry'}
                    </button>
                  </div>
                </div>
                {spendOpen && (
                  <form onSubmit={handleAddSpend} className="bg-bg-elevated border border-border rounded-xl p-3 mb-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={spendForm.amount}
                        onChange={e => setSpendForm(f => ({ ...f, amount: e.target.value }))}
                        placeholder="Amount (CAD)"
                        required
                        className="bg-bg-base border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                      />
                      <input
                        type="date"
                        value={spendForm.date}
                        onChange={e => setSpendForm(f => ({ ...f, date: e.target.value }))}
                        className="bg-bg-base border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                      />
                    </div>
                    <input
                      type="text"
                      value={spendForm.note}
                      onChange={e => setSpendForm(f => ({ ...f, note: e.target.value }))}
                      placeholder="Note (optional)"
                      className="w-full bg-bg-base border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                    <button
                      type="submit"
                      className="w-full py-1.5 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base transition-colors"
                    >
                      Save Entry
                    </button>
                  </form>
                )}
                <div className="space-y-1">
                  {project.spend_entries?.length === 0 && (
                    <p className="text-xs text-text-muted py-2">No spend recorded yet.</p>
                  )}
                  {project.spend_entries?.map(entry => (
                    <div key={entry.id} className="flex items-center gap-3 py-1.5 group/spend border-b border-border/30 last:border-0">
                      <span className="text-sm font-semibold text-text-primary w-20 shrink-0">
                        ${Number(entry.amount_cad).toLocaleString()}
                      </span>
                      <span className="flex-1 text-xs text-text-muted truncate">{entry.note || '—'}</span>
                      <span className="text-[11px] text-text-muted shrink-0">{formatDate(entry.entry_date)}</span>
                      <button
                        onClick={() => deleteSpend.mutate({ id: entry.id, projectId })}
                        className="opacity-0 group-hover/spend:opacity-100 text-text-muted hover:text-danger transition-all text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Photos ── */}
              <div>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Photos</p>
                <PhotoGallery projectId={projectId} />
              </div>

              {/* ── Recurrence ── */}
              <div>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Recurrence</p>
                <RecurrencePanel
                  project={project}
                  onSave={v => updateProject.mutate({ id: projectId, recurrence: v })}
                />
              </div>

              {/* ── AI Suggestions ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">AI Suggestions</p>
                  <button
                    onClick={fetchSuggestions}
                    disabled={aiLoading}
                    className="text-xs text-accent hover:text-amber-300 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {aiLoading ? (
                      <>
                        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                        </svg>
                        Thinking…
                      </>
                    ) : 'Generate'}
                  </button>
                </div>
                {aiSuggestions && (
                  <ul className="space-y-2">
                    {aiSuggestions.map((s, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-text-secondary">
                        <span className="text-accent shrink-0 mt-0.5">→</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ── Activity Log ── */}
              {project.activity_log?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Activity</p>
                  <div className="space-y-2">
                    {project.activity_log.slice(0, 10).map(entry => (
                      <div key={entry.id} className="flex items-start gap-2.5 text-xs text-text-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-text-muted shrink-0 mt-1.5" />
                        <span className="flex-1">
                          {entry.action === 'status_changed'
                            ? `Status: ${entry.detail?.from} → ${entry.detail?.to}`
                            : entry.action === 'spend_added'
                            ? `Spend added: $${Number(entry.detail?.amount).toLocaleString()}${entry.detail?.note ? ` (${entry.detail.note})` : ''}`
                            : entry.action}
                        </span>
                        <span className="shrink-0 text-text-muted/60">{timeAgo(entry.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Sharing ── */}
              <div>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Shared With</p>
                <SharePanel projectId={projectId} />
              </div>

              {/* ── Timestamps ── */}
              <div className="text-[11px] text-text-muted space-y-0.5">
                {project.created_at && <p>Created {timeAgo(project.created_at)}</p>}
                {project.updated_at && project.updated_at !== project.created_at && (
                  <p>Updated {timeAgo(project.updated_at)}</p>
                )}
              </div>

              {/* ── Danger zone ── */}
              <div className="pt-2 pb-4 border-t border-border/50 flex items-center gap-3 flex-wrap">
                <button
                  onClick={async () => {
                    await saveAsTemplate.mutateAsync(project)
                    toast.success('Saved as template')
                  }}
                  disabled={saveAsTemplate.isPending}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors"
                >
                  Save as template
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleDelete}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-lg transition-colors',
                    confirmDelete
                      ? 'bg-danger text-white hover:bg-red-600'
                      : 'text-danger hover:bg-danger/10',
                  )}
                >
                  {confirmDelete ? 'Confirm delete' : 'Delete project'}
                </button>
                {confirmDelete && (
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </>
  )
}
