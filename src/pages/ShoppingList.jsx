import { useState } from 'react'
import AppShell from '../components/layout/AppShell'
import {
  useShoppingList,
  useToggleShoppingItem,
  useDeleteShoppingItem,
  useUpdateShoppingItem,
  useClearCheckedItems,
} from '../hooks/useShoppingList'
import { cn } from '../lib/utils'

function EditableItem({ item }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(item.text)
  const [quantity, setQuantity] = useState(item.quantity ?? '')
  const toggle = useToggleShoppingItem()
  const update = useUpdateShoppingItem()
  const del = useDeleteShoppingItem()

  function save() {
    if (text.trim()) update.mutate({ id: item.id, text: text.trim(), quantity: quantity.trim() })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-bg-elevated rounded-lg">
        <input
          autoFocus
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          placeholder="qty"
          className="w-16 bg-bg-base border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
        />
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          className="flex-1 bg-bg-base border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent"
        />
        <button onClick={save} className="text-xs text-accent hover:text-amber-300 transition-colors px-2">Save</button>
        <button onClick={() => setEditing(false)} className="text-xs text-text-muted hover:text-text-secondary transition-colors">Cancel</button>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-3 py-2 px-3 rounded-lg group hover:bg-bg-elevated/50 transition-colors', item.checked && 'opacity-50')}>
      <button
        onClick={() => toggle.mutate({ id: item.id, checked: !item.checked })}
        className={cn(
          'w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors',
          item.checked ? 'bg-accent border-accent' : 'border-border hover:border-accent'
        )}
      >
        {item.checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {item.quantity && (
        <span className="text-xs text-text-muted shrink-0 w-12 text-right">{item.quantity}</span>
      )}

      <span
        onClick={() => !item.checked && setEditing(true)}
        className={cn('flex-1 text-sm text-text-primary cursor-text', item.checked && 'line-through text-text-muted')}
      >
        {item.text}
      </span>

      <button
        onClick={() => del.mutate(item.id)}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger text-xs w-5 h-5 flex items-center justify-center transition-all"
      >
        ✕
      </button>
    </div>
  )
}

export default function ShoppingList() {
  const { data: items = [], isLoading } = useShoppingList()
  const clearChecked = useClearCheckedItems()

  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)

  // Group unchecked items by project
  const groups = unchecked.reduce((acc, item) => {
    const key = item.project_id ?? '__none__'
    const label = item.projects?.title ?? 'No project'
    if (!acc[key]) acc[key] = { label, room: item.projects?.room ?? null, items: [] }
    acc[key].items.push(item)
    return acc
  }, {})

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Shopping List</h1>
            <p className="text-sm text-text-muted mt-0.5">
              {unchecked.length} item{unchecked.length !== 1 ? 's' : ''} remaining
            </p>
          </div>
          {checked.length > 0 && (
            <button
              onClick={() => clearChecked.mutate()}
              disabled={clearChecked.isPending}
              className="text-xs text-text-muted hover:text-danger transition-colors"
            >
              Clear {checked.length} checked
            </button>
          )}
        </div>

        {isLoading && (
          <div className="text-center text-text-muted text-sm py-12">Loading…</div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="text-center text-text-muted text-sm py-16">
            <p className="text-4xl mb-4">🛒</p>
            <p className="font-medium text-text-secondary mb-1">Your list is empty</p>
            <p className="text-xs">Generate materials from a project to get started.</p>
          </div>
        )}

        {/* Unchecked items grouped by project */}
        <div className="space-y-6">
          {Object.entries(groups).map(([key, group]) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{group.label}</p>
                {group.room && <span className="text-[10px] text-text-muted/60">· {group.room}</span>}
              </div>
              <div className="space-y-0.5">
                {group.items.map(item => <EditableItem key={item.id} item={item} />)}
              </div>
            </div>
          ))}
        </div>

        {/* Checked items at the bottom */}
        {checked.length > 0 && (
          <div className="mt-8">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Checked off</p>
            <div className="space-y-0.5">
              {checked.map(item => <EditableItem key={item.id} item={item} />)}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
