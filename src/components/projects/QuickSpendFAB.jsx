import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { useProjects, useAddSpend } from '../../hooks/useProjects'
import { parseReceiptImage } from '../../lib/anthropic'
import { toast } from '../../stores/toastStore'

export default function QuickSpendFAB() {
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [link, setLink] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const [receiptScanning, setReceiptScanning] = useState(false)
  const receiptInputRef = useRef(null)

  const { data: projects = [] } = useProjects()
  const addSpend = useAddSpend()

  async function handleReceiptScan(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptScanning(true)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const result = await parseReceiptImage(base64, file.type)
      if (result.amount_cad) setAmount(String(result.amount_cad))
      if (result.note) setNote(result.note)
      if (result.date) setDate(result.date)
    } catch {
      toast.error('Could not read receipt. Try a clearer photo.')
    } finally {
      setReceiptScanning(false)
      if (receiptInputRef.current) receiptInputRef.current.value = ''
    }
  }

  const sorted = [...projects].sort((a, b) => {
    const order = { 'In Progress': 0, 'Blocked': 1, 'Backlog': 2, 'Done': 3 }
    return (order[a.status] ?? 4) - (order[b.status] ?? 4) || a.title.localeCompare(b.title)
  })

  function handleClose() {
    setOpen(false)
    setProjectId('')
    setAmount('')
    setNote('')
    setLink('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!projectId || !amount || Number(amount) <= 0) return
    await addSpend.mutateAsync({
      projectId,
      amount_cad: Number(amount),
      note: note.trim() || null,
      entry_date: date,
      receipt_url: link.trim() || null,
    })
    handleClose()
  }

  return (
    <>
      {/* FAB — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 sm:hidden w-14 h-14 bg-accent text-bg-base rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Log spend"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Bottom sheet — mobile only */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 sm:hidden"
            onClick={handleClose}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-bg-surface rounded-t-2xl border-t border-border px-5 pt-5 pb-8 space-y-4">
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-1" />

            {/* Hidden file input for receipt scanning */}
            <input
              ref={receiptInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleReceiptScan}
            />

            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-text-primary">Log Spend</h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => receiptInputRef.current?.click()}
                  disabled={receiptScanning}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
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
                <button onClick={handleClose} className="text-text-muted hover:text-text-primary p-1 -mr-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                required
                className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-3 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="">Select project…</option>
                {sorted.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}{p.properties?.name ? ` · ${p.properties.name}` : ''}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Amount (CAD)"
                  required
                  className="bg-bg-elevated border border-border rounded-xl px-3 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="bg-bg-elevated border border-border rounded-xl px-3 py-3 text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Note (optional)"
                className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
              <input
                type="url"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="Product link (optional)"
                className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />

              <button
                type="submit"
                disabled={addSpend.isPending || !projectId || !amount}
                className="w-full py-3 rounded-xl text-sm font-bold bg-accent hover:bg-amber-400 text-bg-base transition-colors disabled:opacity-50"
              >
                {addSpend.isPending ? 'Saving…' : 'Save Entry'}
              </button>
            </form>
          </div>
        </>
      )}
    </>
  )
}
