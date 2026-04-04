import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProperties } from '../../hooks/useProperties'
import { useRoomTypes, useCreateRoomType } from '../../hooks/useAdmin'
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../lib/utils'
import Combobox from '../ui/Combobox'

const DEFAULT_FORM = {
  title: '',
  property_id: '',
  room: 'Other',
  status: 'Backlog',
  priority: 'Medium',
  due_date: '',
  estimate_cad: '',
  vendor: '',
  notes: '',
}

export default function NewProjectModal({ open, onClose, onCreate, initialData = null }) {
  const { data: properties = [] } = useProperties()
  const { data: roomTypes = [] } = useRoomTypes()
  const createRoomType = useCreateRoomType()
  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM, ...initialData }))
  const [subtasks, setSubtasks] = useState(initialData?.subtasks ?? [])
  const [newSubtask, setNewSubtask] = useState('')
  const [saving, setSaving] = useState(false)

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function addSubtask() {
    if (!newSubtask.trim()) return
    setSubtasks(s => [...s, { text: newSubtask.trim() }])
    setNewSubtask('')
  }

  function removeSubtask(i) {
    setSubtasks(s => s.filter((_, j) => j !== i))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onCreate({
        project: {
          title: form.title.trim(),
          property_id: form.property_id || null,
          room: form.room,
          status: form.status,
          priority: form.priority,
          due_date: form.due_date || null,
          estimate_cad: form.estimate_cad ? Number(form.estimate_cad) : 0,
          vendor: form.vendor?.trim() || null,
          notes: form.notes?.trim() || null,
        },
        subtasks: subtasks.filter(s => s.text?.trim()),
      })
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setForm({ ...DEFAULT_FORM })
    setSubtasks([])
    setNewSubtask('')
    onClose()
  }

  const inputCls = 'w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-bg-surface border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl pointer-events-auto scrollbar-thin">
              <div className="px-6 py-5 border-b border-border flex items-center justify-between sticky top-0 bg-bg-surface z-10">
                <h2 className="font-display text-base font-bold text-text-primary">
                  {initialData ? 'Review AI Project' : 'New Project'}
                </h2>
                <button onClick={handleClose} className="text-text-muted hover:text-text-primary transition-colors p-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder="e.g. Replace kitchen faucet"
                    className={inputCls}
                    autoFocus
                    required
                  />
                </div>

                {/* Property + Room */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Property</label>
                    <select value={form.property_id} onChange={e => set('property_id', e.target.value)} className={inputCls}>
                      <option value="">— None —</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Room</label>
                    <Combobox
                      value={form.room}
                      onChange={v => set('room', v)}
                      options={roomTypes.map(r => r.name)}
                      onCreate={name => createRoomType.mutateAsync(name)}
                      placeholder="Select room…"
                    />
                  </div>
                </div>

                {/* Status + Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Status</label>
                    <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Priority</label>
                    <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inputCls}>
                      {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                {/* Due date + Estimate */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Due Date</label>
                    <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Estimate (CAD $)</label>
                    <input type="number" min="0" step="0.01" value={form.estimate_cad} onChange={e => set('estimate_cad', e.target.value)} placeholder="0" className={inputCls} />
                  </div>
                </div>

                {/* Vendor */}
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Vendor / Contractor</label>
                  <input type="text" value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="e.g. Home Depot, John's Plumbing" className={inputCls} />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Notes</label>
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Any details…" className={`${inputCls} resize-none`} />
                </div>

                {/* Subtasks */}
                <div>
                  <label className="block text-xs text-text-muted mb-2">Subtasks</label>
                  {subtasks.length > 0 && (
                    <div className="space-y-1.5 mb-2.5">
                      {subtasks.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                          <span className="text-text-muted shrink-0">·</span>
                          <span className="flex-1">{s.text}</span>
                          <button type="button" onClick={() => removeSubtask(i)}
                            className="text-text-muted hover:text-danger text-xs transition-colors">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSubtask}
                      onChange={e => setNewSubtask(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask() } }}
                      placeholder="Add a subtask…"
                      className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                    <button type="button" onClick={addSubtask}
                      className="px-3 py-1.5 rounded-lg text-sm bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors">
                      Add
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={handleClose}
                    className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base transition-colors disabled:opacity-50">
                    {saving ? 'Creating…' : 'Create Project'}
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
