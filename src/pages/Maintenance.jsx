import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AppShell from '../components/layout/AppShell'
import { useProperties } from '../hooks/useProperties'
import {
  useMaintenancePlans, useMaintenanceProjects,
  useCreatePlan, useCreatePlans, useUpdatePlan, useDeletePlan,
} from '../hooks/useMaintenance'
import { anchorMonths } from '../lib/maintenanceSchedule'
import { suggestMaintenancePlans } from '../lib/anthropic'
import { useUIStore } from '../stores/uiStore'
import { Skeleton } from '../components/ui/Skeleton'
import { cn, PRIORITY_OPTIONS, ROOM_OPTIONS } from '../lib/utils'
import { toast } from '../stores/toastStore'

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const CADENCES = ['monthly', 'quarterly', 'biannual', 'annual']

const EMPTY_PLAN = {
  title: '', cadence: 'annual', anchor_month: new Date().getMonth() + 1,
  lead_days: 14, checklist: [], estimate_cad: '', room: 'Other',
  priority: 'Medium', vendor: '', active: true,
}

const inputCls = 'w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent'

// ── Year strip: one cell per month with generated-project status ─────────────
function YearStrip({ plan, projects }) {
  const year = new Date().getFullYear()
  const thisMonth = new Date().getMonth() + 1
  const dueMonths = anchorMonths(plan)
  const byMonth = useMemo(() => {
    const map = {}
    for (const p of projects) {
      if (p.maintenance_plan_id !== plan.id || !p.due_date) continue
      const [y, m] = p.due_date.split('-').map(Number)
      if (y === year) map[m] = p
    }
    return map
  }, [projects, plan.id, year])

  return (
    <div className="flex gap-1">
      {MONTHS.map((label, i) => {
        const m = i + 1
        const isDue = dueMonths.includes(m)
        const gen = byMonth[m]
        let cls = 'bg-bg-base text-text-muted/40' // not scheduled
        let title = MONTH_FULL[i]
        if (isDue) {
          if (gen?.status === 'Done') { cls = 'bg-success/25 text-success'; title += ' — done ✓' }
          else if (gen) { cls = 'bg-info/25 text-info'; title += ` — ${gen.status}` }
          else if (m < thisMonth) { cls = 'bg-danger/20 text-danger'; title += ' — missed' }
          else { cls = 'bg-bg-elevated text-text-secondary border border-border'; title += ' — scheduled' }
        }
        return (
          <span
            key={i}
            title={title}
            className={cn('w-6 h-6 rounded text-[10px] font-semibold flex items-center justify-center', cls)}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}

// ── Create/edit plan modal ────────────────────────────────────────────────────
function PlanModal({ open, onClose, onSave, properties, initial }) {
  const [form, setForm] = useState(initial ?? EMPTY_PLAN)
  const [prevInitial, setPrevInitial] = useState(initial)
  const [newItem, setNewItem] = useState('')
  if (prevInitial !== initial) {
    setPrevInitial(initial)
    setForm(initial ?? EMPTY_PLAN)
  }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave({
      ...form,
      title: form.title.trim(),
      estimate_cad: form.estimate_cad ? Number(form.estimate_cad) : 0,
      anchor_month: Number(form.anchor_month),
      lead_days: Number(form.lead_days) || 14,
      vendor: form.vendor?.trim() || null,
      property_id: form.property_id || null,
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
            role="dialog" aria-label="Maintenance plan"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 pointer-events-none"
          >
            <div className="bg-bg-surface sm:border border-border sm:rounded-2xl w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto shadow-2xl pointer-events-auto scrollbar-thin">
              <div className="px-6 py-5 border-b border-border flex items-center justify-between sticky top-0 bg-bg-surface z-10">
                <h2 className="font-display text-base font-bold text-text-primary">
                  {form.id ? 'Edit Plan' : 'New Maintenance Plan'}
                </h2>
                <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1">✕</button>
              </div>
              <form onSubmit={submit} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Task *</label>
                  <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                    placeholder="e.g. Replace furnace filter" className={inputCls} autoFocus required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Property</label>
                    <select value={form.property_id ?? ''} onChange={e => set('property_id', e.target.value)} className={inputCls}>
                      <option value="">— None —</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Room / Area</label>
                    <select value={form.room} onChange={e => set('room', e.target.value)} className={inputCls}>
                      {ROOM_OPTIONS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Cadence</label>
                    <select value={form.cadence} onChange={e => set('cadence', e.target.value)} className={inputCls}>
                      {CADENCES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">
                      {form.cadence === 'monthly' ? 'Anchor (ignored)' : 'Month'}
                    </label>
                    <select value={form.anchor_month} onChange={e => set('anchor_month', e.target.value)}
                      className={inputCls} disabled={form.cadence === 'monthly'}>
                      {MONTH_FULL.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Lead days</label>
                    <input type="number" min="0" max="90" value={form.lead_days}
                      onChange={e => set('lead_days', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Estimate (CAD)</label>
                    <input type="number" min="0" step="0.01" value={form.estimate_cad}
                      onChange={e => set('estimate_cad', e.target.value)} placeholder="0" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Priority</label>
                    <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inputCls}>
                      {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Vendor</label>
                  <input type="text" value={form.vendor ?? ''} onChange={e => set('vendor', e.target.value)}
                    placeholder="e.g. Ottawa Duct Cleaning" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-2">Checklist (becomes subtasks)</label>
                  {form.checklist.length > 0 && (
                    <div className="space-y-1.5 mb-2.5">
                      {form.checklist.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                          <span className="text-text-muted shrink-0">·</span>
                          <span className="flex-1">{c.text}</span>
                          <button type="button"
                            onClick={() => set('checklist', form.checklist.filter((_, j) => j !== i))}
                            className="text-text-muted hover:text-danger text-xs">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (newItem.trim()) { set('checklist', [...form.checklist, { text: newItem.trim() }]); setNewItem('') }
                        }
                      }}
                      placeholder="Add a step…" className={inputCls} />
                    <button type="button"
                      onClick={() => { if (newItem.trim()) { set('checklist', [...form.checklist, { text: newItem.trim() }]); setNewItem('') } }}
                      className="px-3 py-1.5 rounded-lg text-sm bg-bg-elevated border border-border text-text-secondary hover:text-text-primary">
                      Add
                    </button>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base">
                    {form.id ? 'Save Changes' : 'Create Plan'}
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

// ── AI suggestions review modal ───────────────────────────────────────────────
function SuggestModal({ open, onClose, suggestions, property, onAdd }) {
  const [checked, setChecked] = useState(() => new Set(suggestions.map((_, i) => i)))
  const [prevSuggestions, setPrevSuggestions] = useState(suggestions)
  if (prevSuggestions !== suggestions) {
    setPrevSuggestions(suggestions)
    setChecked(new Set(suggestions.map((_, i) => i)))
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
            role="dialog" aria-label="AI plan suggestions"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-bg-surface border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl pointer-events-auto scrollbar-thin">
              <div className="px-6 py-5 border-b border-border sticky top-0 bg-bg-surface">
                <h2 className="font-display text-base font-bold text-text-primary">
                  Suggested plans — {property?.name}
                </h2>
                <p className="text-xs text-text-muted mt-1">Uncheck anything you don't want, then add.</p>
              </div>
              <div className="px-6 py-4 space-y-3">
                {suggestions.map((s, i) => (
                  <label key={i} className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={checked.has(i)}
                      onChange={() => setChecked(prev => {
                        const next = new Set(prev)
                        if (next.has(i)) next.delete(i)
                        else next.add(i)
                        return next
                      })}
                      className="mt-1 w-3.5 h-3.5 accent-accent" />
                    <span className="flex-1">
                      <span className="block text-sm text-text-primary font-medium">{s.title}</span>
                      <span className="block text-xs text-text-muted">
                        {s.cadence} · {MONTH_FULL[(s.anchor_month ?? 1) - 1]}
                        {s.estimate_cad > 0 && ` · ~$${s.estimate_cad}`}
                        {s.checklist?.length > 0 && ` · ${s.checklist.length} steps`}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-bg-surface">
                <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
                <button
                  onClick={() => { onAdd(suggestions.filter((_, i) => checked.has(i))); onClose() }}
                  disabled={checked.size === 0}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base disabled:opacity-50"
                >
                  Add {checked.size} plan{checked.size === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Maintenance() {
  const { data: properties = [] } = useProperties()
  const { data: plans = [], isLoading } = useMaintenancePlans()
  const { data: genProjects = [] } = useMaintenanceProjects()
  const createPlan = useCreatePlan()
  const createPlans = useCreatePlans()
  const updatePlan = useUpdatePlan()
  const deletePlan = useDeletePlan()
  const { openDetail } = useUIStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [aiLoading, setAiLoading] = useState(null) // property id while loading
  const [suggestions, setSuggestions] = useState(null) // { property, items }

  const groups = useMemo(() => {
    const byProp = new Map()
    for (const plan of plans) {
      const key = plan.properties?.id ?? 'none'
      if (!byProp.has(key)) byProp.set(key, { property: plan.properties, plans: [] })
      byProp.get(key).plans.push(plan)
    }
    // Show all properties even without plans, so the AI-seed button is visible
    for (const prop of properties) {
      if (!byProp.has(prop.id)) byProp.set(prop.id, { property: prop, plans: [] })
    }
    return [...byProp.values()].sort((a, b) => (a.property?.name ?? 'zz').localeCompare(b.property?.name ?? 'zz'))
  }, [plans, properties])

  async function handleSuggest(property) {
    setAiLoading(property.id)
    try {
      const items = await suggestMaintenancePlans(
        { name: property.name, address: property.address },
        plans.filter(p => p.properties?.id === property.id).map(p => p.title),
      )
      if (!Array.isArray(items) || items.length === 0) {
        toast.info('No new suggestions for this property.')
      } else {
        setSuggestions({ property, items })
      }
    } catch {
      toast.error('Could not get AI suggestions. Try again.')
    } finally {
      setAiLoading(null)
    }
  }

  function handleSave(form) {
    const { properties: _p, ...fields } = form
    if (form.id) updatePlan.mutate(fields)
    else createPlan.mutate(fields)
  }

  return (
    <AppShell>
      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-4xl space-y-6 overflow-y-auto flex-1 scrollbar-thin">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold text-text-primary">Maintenance</h1>
            <p className="text-xs text-text-muted mt-0.5">
              Recurring upkeep — projects generate automatically ahead of their due date.
            </p>
          </div>
          <button
            onClick={() => { setEditing(null); setModalOpen(true) }}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base"
          >
            + New Plan
          </button>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        )}

        {!isLoading && groups.map(({ property, plans: groupPlans }) => (
          <div key={property?.id ?? 'none'} className="bg-bg-surface border border-border rounded-2xl px-5 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {property?.color && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: property.color }} />}
                <p className="text-sm font-semibold text-text-primary">{property?.name ?? 'No property'}</p>
                <span className="text-xs text-text-muted">{groupPlans.length} plan{groupPlans.length === 1 ? '' : 's'}</span>
              </div>
              {property && (
                <button
                  onClick={() => handleSuggest(property)}
                  disabled={aiLoading === property.id}
                  className="text-xs text-accent hover:text-amber-300 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {aiLoading === property.id ? 'Thinking…' : '✨ Suggest a plan'}
                </button>
              )}
            </div>

            {groupPlans.length === 0 && (
              <p className="text-sm text-text-muted">No plans yet — add one or let AI suggest a seasonal schedule.</p>
            )}

            <div className="space-y-3">
              {groupPlans.map(plan => {
                const generated = genProjects.filter(p => p.maintenance_plan_id === plan.id)
                const openGen = generated.find(p => p.status !== 'Done')
                return (
                  <div key={plan.id} className={cn('flex flex-col sm:flex-row sm:items-center gap-3 py-2', !plan.active && 'opacity-50')}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditing({ ...plan, estimate_cad: plan.estimate_cad ?? '' }); setModalOpen(true) }}
                          className="text-sm text-text-primary font-medium hover:text-accent text-left truncate"
                        >
                          {plan.title}
                        </button>
                        {!plan.active && <span className="text-[10px] text-text-muted uppercase">paused</span>}
                      </div>
                      <p className="text-xs text-text-muted">
                        {plan.cadence}
                        {plan.cadence !== 'monthly' && ` · ${MONTH_FULL[(plan.anchor_month ?? 1) - 1]}`}
                        {Number(plan.estimate_cad) > 0 && ` · ~$${Number(plan.estimate_cad).toLocaleString()}`}
                        {openGen && (
                          <>
                            {' · '}
                            <button onClick={() => openDetail(openGen.id)} className="text-info hover:underline">
                              open project →
                            </button>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <YearStrip plan={plan} projects={genProjects} />
                      <button
                        onClick={() => updatePlan.mutate({ id: plan.id, active: !plan.active })}
                        title={plan.active ? 'Pause plan' : 'Resume plan'}
                        className="text-text-muted hover:text-text-primary text-xs"
                      >
                        {plan.active ? '⏸' : '▶'}
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete plan "${plan.title}"?`)) deletePlan.mutate(plan.id) }}
                        title="Delete plan"
                        className="text-text-muted hover:text-danger text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <PlanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        properties={properties}
        initial={editing}
      />
      <SuggestModal
        open={!!suggestions}
        onClose={() => setSuggestions(null)}
        suggestions={suggestions?.items ?? []}
        property={suggestions?.property}
        onAdd={items => createPlans.mutate(items.map(s => ({
          property_id: suggestions.property.id,
          title: s.title,
          cadence: CADENCES.includes(s.cadence) ? s.cadence : 'annual',
          anchor_month: Math.min(12, Math.max(1, Number(s.anchor_month) || 1)),
          checklist: Array.isArray(s.checklist) ? s.checklist.filter(c => c?.text) : [],
          estimate_cad: Number(s.estimate_cad) || 0,
          room: ROOM_OPTIONS.includes(s.room) ? s.room : 'Other',
        })))}
      />
    </AppShell>
  )
}
