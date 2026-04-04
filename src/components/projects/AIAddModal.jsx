import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { parseProjectFromText } from '../../lib/anthropic'
import { useProperties } from '../../hooks/useProperties'
import NewProjectModal from './NewProjectModal'

export default function AIAddModal({ open, onClose, onCreate }) {
  const { data: properties = [] } = useProperties()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [parsed, setParsed] = useState(null)

  async function handleParse() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await parseProjectFromText(text)
      // Resolve property name → id
      const prop = properties.find(p => p.name === result.property)
      const initialData = {
        title: result.title ?? '',
        property_id: prop?.id ?? '',
        room: result.room ?? 'Other',
        status: result.status ?? 'Backlog',
        priority: result.priority ?? 'Medium',
        due_date: (!result.due_date || result.due_date === 'null') ? '' : result.due_date,
        estimate_cad: result.estimate_cad ?? '',
        vendor: result.vendor ?? '',
        notes: result.notes ?? '',
        subtasks: Array.isArray(result.subtasks) ? result.subtasks : [],
      }
      setParsed(initialData)
    } catch (e) {
      setError('Failed to parse. Check your Anthropic API key and try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setText('')
    setParsed(null)
    setError(null)
    onClose()
  }

  // Once parsed, hand off to NewProjectModal
  if (parsed) {
    return (
      <NewProjectModal
        open={true}
        onClose={handleClose}
        onCreate={onCreate}
        initialData={parsed}
      />
    )
  }

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
            <div className="bg-bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto">
              <div className="px-6 py-5 border-b border-border flex items-start justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-text-primary">AI Add</h2>
                  <p className="text-xs text-text-muted mt-0.5">Describe a project in plain English</p>
                </div>
                <button onClick={handleClose} className="text-text-muted hover:text-text-primary transition-colors p-1 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="px-6 py-5">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={5}
                  placeholder={`e.g. "Need to replace the eavestrough on the King George house before winter. Probably $800, it's urgent, exterior work. Get a quote from a contractor."`}
                  className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParse() }}
                />
                {error && <p className="mt-2 text-xs text-danger">{error}</p>}
                <p className="mt-1.5 text-[11px] text-text-muted">
                  Tip: mention property, room, budget, and urgency for best results. ⌘↵ to parse.
                </p>
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={handleClose}
                    className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleParse}
                    disabled={loading || !text.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                        Parsing…
                      </>
                    ) : 'Parse with AI →'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
