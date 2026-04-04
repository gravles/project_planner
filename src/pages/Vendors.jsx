import { useState, useMemo } from 'react'
import AppShell from '../components/layout/AppShell'
import { useProjects } from '../hooks/useProjects'
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from '../hooks/useVendors'
import { cn } from '../lib/utils'

function VendorForm({ initial = {}, onSave, onCancel, saveLabel = 'Save' }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', website: '', notes: '', ...initial })
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  const inputCls = 'w-full bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent'
  return (
    <div className="space-y-2.5 p-4 bg-bg-elevated border border-border rounded-xl">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-text-muted mb-1">Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Vendor name" className={inputCls} autoFocus />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Phone</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="613-555-0100" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@example.com" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Website</label>
          <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="example.com" className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">Notes</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Rates, availability, ratings…" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => form.name.trim() && onSave(form)} disabled={!form.name.trim()}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base transition-colors disabled:opacity-50">
          {saveLabel}
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
      </div>
    </div>
  )
}

export default function Vendors() {
  const { data: projects = [] } = useProjects()
  const { data: vendors = [] } = useVendors()
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()
  const deleteVendor = useDeleteVendor()

  const [selected, setSelected] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // All unique vendor name strings from projects
  const projectVendorNames = useMemo(() =>
    [...new Set(projects.filter(p => p.vendor?.trim()).map(p => p.vendor.trim()))].sort()
  , [projects])

  // Merged list: vendor records + any project vendors not in directory
  const vendorRecordNames = new Set(vendors.map(v => v.name.toLowerCase()))
  const unrecordedNames = projectVendorNames.filter(n => !vendorRecordNames.has(n.toLowerCase()))

  const allNames = useMemo(() => {
    const s = new Set([...vendors.map(v => v.name), ...projectVendorNames])
    return [...s].sort()
  }, [vendors, projectVendorNames])

  function getProjects(name) {
    return projects.filter(p => p.vendor?.trim().toLowerCase() === name.toLowerCase())
  }
  function getSpend(name) {
    return getProjects(name).reduce((s, p) =>
      s + (p.spend_entries?.reduce((a, e) => a + Number(e.amount_cad), 0) ?? 0), 0)
  }
  function getRecord(name) {
    return vendors.find(v => v.name.toLowerCase() === name.toLowerCase())
  }

  const selectedProjects = selected ? getProjects(selected) : []
  const selectedRecord = selected ? getRecord(selected) : null

  async function handleDelete(id) {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    await deleteVendor.mutateAsync(id)
    setConfirmDeleteId(null)
    setEditId(null)
  }

  return (
    <AppShell onNewProject={() => {}} onAIAdd={() => {}}>
      <div className="flex-1 overflow-hidden flex">
        {/* Left: vendor list */}
        <div className="w-72 shrink-0 border-r border-border overflow-y-auto scrollbar-thin p-4 space-y-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-bold text-text-primary">Vendors</h2>
            <button onClick={() => { setAddOpen(true); setSelected(null) }}
              className="text-xs text-accent hover:text-amber-300 transition-colors">+ Add</button>
          </div>

          {addOpen && (
            <VendorForm
              saveLabel="Add vendor"
              onSave={async form => { await createVendor.mutateAsync(form); setAddOpen(false) }}
              onCancel={() => setAddOpen(false)}
            />
          )}

          {allNames.map(name => {
            const rec = getRecord(name)
            const pCount = getProjects(name).length
            const spend = getSpend(name)
            return (
              <button
                key={name}
                onClick={() => { setSelected(name); setEditId(null) }}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-xl transition-colors',
                  selected === name ? 'bg-bg-elevated' : 'hover:bg-bg-elevated/60',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-medium', rec ? 'text-text-primary' : 'text-text-secondary')}>
                    {name}
                  </span>
                  {!rec && <span className="text-[10px] text-text-muted border border-border px-1 rounded">no record</span>}
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {pCount} project{pCount !== 1 ? 's' : ''}
                  {spend > 0 && ` · $${spend.toLocaleString()}`}
                </div>
              </button>
            )
          })}

          {allNames.length === 0 && (
            <p className="text-sm text-text-muted px-2">No vendors yet. Add a vendor or assign vendors to projects.</p>
          )}
        </div>

        {/* Right: detail panel */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-text-muted text-sm">
              Select a vendor to see details
            </div>
          ) : (
            <div className="max-w-xl space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold text-text-primary">{selected}</h2>
                  <p className="text-sm text-text-muted mt-0.5">
                    {selectedProjects.length} project{selectedProjects.length !== 1 ? 's' : ''} · ${getSpend(selected).toLocaleString()} total spend
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedRecord ? (
                    <>
                      <button onClick={() => setEditId(selectedRecord.id)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(selectedRecord.id)}
                        className={cn('text-xs px-2.5 py-1 rounded-lg transition-colors',
                          confirmDeleteId === selectedRecord.id ? 'bg-danger text-white' : 'text-danger hover:bg-danger/10')}>
                        {confirmDeleteId === selectedRecord.id ? 'Confirm delete' : 'Delete'}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setAddOpen(true)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-border text-accent hover:bg-accent/10 transition-colors">
                      + Add contact info
                    </button>
                  )}
                </div>
              </div>

              {/* Edit form */}
              {editId && selectedRecord && (
                <VendorForm
                  initial={selectedRecord}
                  saveLabel="Save changes"
                  onSave={async form => { await updateVendor.mutateAsync({ id: editId, ...form }); setEditId(null) }}
                  onCancel={() => setEditId(null)}
                />
              )}

              {/* Add contact form (for unrecorded vendor) */}
              {addOpen && !selectedRecord && (
                <VendorForm
                  initial={{ name: selected }}
                  saveLabel="Add to directory"
                  onSave={async form => { await createVendor.mutateAsync(form); setAddOpen(false) }}
                  onCancel={() => setAddOpen(false)}
                />
              )}

              {/* Contact info */}
              {selectedRecord && !editId && (selectedRecord.phone || selectedRecord.email || selectedRecord.website || selectedRecord.notes) && (
                <div className="bg-bg-surface border border-border rounded-xl p-4 space-y-2">
                  {selectedRecord.phone && (
                    <div className="flex gap-3 text-sm">
                      <span className="text-text-muted w-16 shrink-0">Phone</span>
                      <a href={`tel:${selectedRecord.phone}`} className="text-text-secondary hover:text-accent">{selectedRecord.phone}</a>
                    </div>
                  )}
                  {selectedRecord.email && (
                    <div className="flex gap-3 text-sm">
                      <span className="text-text-muted w-16 shrink-0">Email</span>
                      <a href={`mailto:${selectedRecord.email}`} className="text-text-secondary hover:text-accent">{selectedRecord.email}</a>
                    </div>
                  )}
                  {selectedRecord.website && (
                    <div className="flex gap-3 text-sm">
                      <span className="text-text-muted w-16 shrink-0">Website</span>
                      <span className="text-text-secondary">{selectedRecord.website}</span>
                    </div>
                  )}
                  {selectedRecord.notes && (
                    <div className="flex gap-3 text-sm">
                      <span className="text-text-muted w-16 shrink-0 pt-0.5">Notes</span>
                      <p className="text-text-secondary leading-relaxed">{selectedRecord.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Projects for this vendor */}
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Projects</h3>
                {selectedProjects.length === 0 ? (
                  <p className="text-sm text-text-muted">No projects assigned to this vendor.</p>
                ) : (
                  <div className="space-y-1">
                    {selectedProjects.map(p => {
                      const spend = p.spend_entries?.reduce((a, e) => a + Number(e.amount_cad), 0) ?? 0
                      return (
                        <div key={p.id} className="flex items-center gap-3 px-3 py-2 bg-bg-surface border border-border rounded-xl">
                          {p.properties && (
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.properties.color }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{p.title}</p>
                            <p className="text-xs text-text-muted">{p.status} · {p.room}</p>
                          </div>
                          {spend > 0 && (
                            <span className="text-xs text-text-secondary shrink-0">${spend.toLocaleString()}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
