import { useState } from 'react'
import AppShell from '../components/layout/AppShell'
import { useProperties } from '../hooks/useProperties'
import {
  useCreateProperty, useUpdateProperty, useDeleteProperty,
  useRoomTypes, useCreateRoomType, useDeleteRoomType, useUpdateRoomType,
  useTags, useCreateTag, useUpdateTag, useDeleteTag,
} from '../hooks/useAdmin'
import { cn } from '../lib/utils'

const PRESET_COLORS = [
  '#818cf8', '#34d399', '#fb923c', '#60a5fa',
  '#f472b6', '#a78bfa', '#fbbf24', '#ef4444',
  '#22c55e', '#06b6d4', '#e879f9', '#f97316',
]

const PRESET_ICONS = ['🏠', '🏡', '🏗️', '🏢', '🏚️', '🏬', '🏠', '🏘️']

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
            value === c ? 'border-white scale-110' : 'border-transparent',
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-lg font-bold text-text-primary">{title}</h2>
      {subtitle && <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ── Properties Section ────────────────────────────────────────────────────────

function PropertiesSection() {
  const { data: properties = [] } = useProperties()
  const createProperty = useCreateProperty()
  const updateProperty = useUpdateProperty()
  const deleteProperty = useDeleteProperty()

  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', address: '', icon: '🏠', color: '#818cf8' })
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  function startEdit(prop) {
    setEditId(prop.id)
    setEditForm({ name: prop.name, address: prop.address ?? '', icon: prop.icon, color: prop.color })
  }

  async function saveEdit() {
    await updateProperty.mutateAsync({ id: editId, ...editForm })
    setEditId(null)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!addForm.name.trim()) return
    const sort_order = (properties[properties.length - 1]?.sort_order ?? 0) + 1
    await createProperty.mutateAsync({ ...addForm, sort_order })
    setAddForm({ name: '', address: '', icon: '🏠', color: '#818cf8' })
    setAddOpen(false)
  }

  async function handleDelete(id) {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    await deleteProperty.mutateAsync(id)
    setConfirmDeleteId(null)
  }

  return (
    <div className="bg-bg-surface border border-border rounded-2xl p-5">
      <SectionHeader
        title="Properties"
        subtitle="The physical properties you manage. These appear as filters in the sidebar."
      />

      <div className="space-y-2 mb-4">
        {properties.map(prop => (
          <div key={prop.id}>
            {editId === prop.id ? (
              <div className="bg-bg-elevated border border-border rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Name</label>
                    <input
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-bg-base border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Icon</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {PRESET_ICONS.map(ico => (
                        <button
                          key={ico}
                          type="button"
                          onClick={() => setEditForm(f => ({ ...f, icon: ico }))}
                          className={cn('text-lg p-1 rounded-lg transition-colors', editForm.icon === ico ? 'bg-accent/20' : 'hover:bg-bg-base')}
                        >
                          {ico}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Address</label>
                  <input
                    value={editForm.address}
                    onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="123 Example St"
                    className="w-full bg-bg-base border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-2">Colour</label>
                  <ColorPicker value={editForm.color} onChange={c => setEditForm(f => ({ ...f, color: c }))} />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveEdit} className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base transition-colors">
                    Save
                  </button>
                  <button onClick={() => setEditId(null)} className="px-4 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-bg-elevated transition-colors group">
                <span className="text-xl">{prop.icon}</span>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: prop.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{prop.name}</p>
                  {prop.address && <p className="text-xs text-text-muted truncate">{prop.address}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(prop)}
                    className="text-xs px-2 py-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-base transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(prop.id)}
                    className={cn(
                      'text-xs px-2 py-1 rounded-lg transition-colors',
                      confirmDeleteId === prop.id
                        ? 'bg-danger text-white'
                        : 'text-danger hover:bg-danger/10',
                    )}
                  >
                    {confirmDeleteId === prop.id ? 'Confirm' : 'Delete'}
                  </button>
                  {confirmDeleteId === prop.id && (
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs px-2 py-1 text-text-muted hover:text-text-secondary transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {addOpen ? (
        <form onSubmit={handleAdd} className="bg-bg-elevated border border-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Name *</label>
              <input
                autoFocus
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Rideau Cottage"
                className="w-full bg-bg-base border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Icon</label>
              <div className="flex gap-1.5 flex-wrap">
                {PRESET_ICONS.map(ico => (
                  <button key={ico} type="button" onClick={() => setAddForm(f => ({ ...f, icon: ico }))}
                    className={cn('text-lg p-1 rounded-lg transition-colors', addForm.icon === ico ? 'bg-accent/20' : 'hover:bg-bg-base')}>
                    {ico}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Address</label>
            <input
              value={addForm.address}
              onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))}
              placeholder="123 Example St, Ottawa"
              className="w-full bg-bg-base border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-2">Colour</label>
            <ColorPicker value={addForm.color} onChange={c => setAddForm(f => ({ ...f, color: c }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base transition-colors">
              Add Property
            </button>
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 text-sm text-accent hover:text-amber-300 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add property
        </button>
      )}
    </div>
  )
}

// ── Rooms Section ─────────────────────────────────────────────────────────────

function RoomsSection() {
  const { data: rooms = [] } = useRoomTypes()
  const createRoom = useCreateRoomType()
  const deleteRoom = useDeleteRoomType()
  const updateRoom = useUpdateRoomType()

  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  async function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    await createRoom.mutateAsync(newName.trim())
    setNewName('')
  }

  async function saveEdit(id) {
    if (!editName.trim()) return
    await updateRoom.mutateAsync({ id, name: editName.trim() })
    setEditId(null)
  }

  async function handleDelete(id) {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    await deleteRoom.mutateAsync(id)
    setConfirmDeleteId(null)
  }

  async function moveRoom(id, dir) {
    const idx = rooms.findIndex(r => r.id === id)
    const target = rooms[idx + dir]
    if (!target) return
    await Promise.all([
      updateRoom.mutateAsync({ id, name: rooms[idx].name, sort_order: target.sort_order }),
      updateRoom.mutateAsync({ id: target.id, name: target.name, sort_order: rooms[idx].sort_order }),
    ])
  }

  return (
    <div className="bg-bg-surface border border-border rounded-2xl p-5">
      <SectionHeader
        title="Room Types"
        subtitle="Available room categories when creating or editing a project."
      />

      <div className="space-y-1 mb-4">
        {rooms.map((room, idx) => (
          <div key={room.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-bg-elevated transition-colors group">
            {editId === room.id ? (
              <>
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(room.id); if (e.key === 'Escape') setEditId(null) }}
                  className="flex-1 bg-bg-elevated border border-accent rounded-lg px-3 py-1 text-sm text-text-primary focus:outline-none"
                />
                <button onClick={() => saveEdit(room.id)} className="text-xs px-2 py-1 rounded bg-accent text-bg-base font-semibold">Save</button>
                <button onClick={() => setEditId(null)} className="text-xs text-text-muted hover:text-text-secondary">Cancel</button>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveRoom(room.id, -1)} disabled={idx === 0}
                    className="text-text-muted hover:text-text-primary disabled:opacity-20 leading-none text-[10px]">▲</button>
                  <button onClick={() => moveRoom(room.id, 1)} disabled={idx === rooms.length - 1}
                    className="text-text-muted hover:text-text-primary disabled:opacity-20 leading-none text-[10px]">▼</button>
                </div>
                <span className="flex-1 text-sm text-text-secondary">{room.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditId(room.id); setEditName(room.name) }}
                    className="text-xs px-2 py-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-base transition-colors">
                    Rename
                  </button>
                  <button onClick={() => handleDelete(room.id)}
                    className={cn('text-xs px-2 py-1 rounded-lg transition-colors',
                      confirmDeleteId === room.id ? 'bg-danger text-white' : 'text-danger hover:bg-danger/10')}>
                    {confirmDeleteId === room.id ? 'Confirm' : 'Delete'}
                  </button>
                  {confirmDeleteId === room.id && (
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs px-1 text-text-muted hover:text-text-secondary">✕</button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New room type…"
          className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
        />
        <button type="submit" disabled={!newName.trim()}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base transition-colors disabled:opacity-50">
          Add
        </button>
      </form>
    </div>
  )
}

// ── Tags Section ──────────────────────────────────────────────────────────────

function TagsSection() {
  const { data: tags = [] } = useTags()
  const createTag = useCreateTag()
  const updateTag = useUpdateTag()
  const deleteTag = useDeleteTag()

  const [addForm, setAddForm] = useState({ name: '', color: '#6b7280' })
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  async function handleAdd(e) {
    e.preventDefault()
    if (!addForm.name.trim()) return
    await createTag.mutateAsync(addForm)
    setAddForm({ name: '', color: '#6b7280' })
  }

  async function saveEdit(id) {
    await updateTag.mutateAsync({ id, ...editForm })
    setEditId(null)
  }

  async function handleDelete(id) {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    await deleteTag.mutateAsync(id)
    setConfirmDeleteId(null)
  }

  return (
    <div className="bg-bg-surface border border-border rounded-2xl p-5">
      <SectionHeader
        title="Tags"
        subtitle="Labels you can apply to projects for quick filtering."
      />

      <div className="space-y-1 mb-4">
        {tags.map(tag => (
          <div key={tag.id} className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-bg-elevated transition-colors group">
            {editId === tag.id ? (
              <>
                <input
                  autoFocus
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(tag.id); if (e.key === 'Escape') setEditId(null) }}
                  className="flex-1 bg-bg-elevated border border-accent rounded-lg px-3 py-1 text-sm text-text-primary focus:outline-none"
                />
                <div className="flex gap-1 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setEditForm(f => ({ ...f, color: c }))}
                      className={cn('w-5 h-5 rounded-full border-2 transition-transform hover:scale-110', editForm.color === c ? 'border-white' : 'border-transparent')}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <button onClick={() => saveEdit(tag.id)} className="text-xs px-2 py-1 rounded bg-accent text-bg-base font-semibold">Save</button>
                <button onClick={() => setEditId(null)} className="text-xs text-text-muted hover:text-text-secondary">✕</button>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="flex-1 text-sm text-text-secondary">{tag.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditId(tag.id); setEditForm({ name: tag.name, color: tag.color }) }}
                    className="text-xs px-2 py-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-base transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(tag.id)}
                    className={cn('text-xs px-2 py-1 rounded-lg transition-colors',
                      confirmDeleteId === tag.id ? 'bg-danger text-white' : 'text-danger hover:bg-danger/10')}>
                    {confirmDeleteId === tag.id ? 'Confirm' : 'Delete'}
                  </button>
                  {confirmDeleteId === tag.id && (
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs px-1 text-text-muted hover:text-text-secondary">✕</button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="space-y-2">
        <div className="flex gap-2">
          <input
            value={addForm.name}
            onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
            placeholder="New tag name…"
            className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
          <button type="submit" disabled={!addForm.name.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base transition-colors disabled:opacity-50">
            Add
          </button>
        </div>
        <div className="flex gap-1.5 flex-wrap px-1">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setAddForm(f => ({ ...f, color: c }))}
              className={cn('w-5 h-5 rounded-full border-2 transition-transform hover:scale-110', addForm.color === c ? 'border-white scale-110' : 'border-transparent')}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </form>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = ['Properties', 'Rooms', 'Tags']

export default function Admin() {
  const [tab, setTab] = useState('Properties')

  return (
    <AppShell onNewProject={() => {}} onAIAdd={() => {}}>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-sm text-text-muted mt-1">Manage properties, room types, and tags.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 bg-bg-elevated rounded-xl p-1 mb-6 w-fit">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                t === tab
                  ? 'bg-bg-surface text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Properties' && <PropertiesSection />}
        {tab === 'Rooms' && <RoomsSection />}
        {tab === 'Tags' && <TagsSection />}
      </div>
    </AppShell>
  )
}
