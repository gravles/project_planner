import { useState } from 'react'
import { estimateBudget } from '../../lib/anthropic'
import { useUpdateProject } from '../../hooks/useProjects'
import { toast } from '../../stores/toastStore'

export default function AiBudgetEstimator({ projectId, projectTitle }) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const updateProject = useUpdateProject()

  async function handleEstimate() {
    if (!description.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await estimateBudget(description || projectTitle)
      setResult(data)
    } catch {
      setError('Could not estimate. Check your Anthropic API key.')
    } finally {
      setLoading(false)
    }
  }

  function applyEstimate() {
    updateProject.mutate({ id: projectId, estimate_cad: result.total_cad })
    toast.success(`Estimate set to $${Number(result.total_cad).toLocaleString()}`)
    setOpen(false)
    setResult(null)
    setDescription('')
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-accent hover:text-amber-300 transition-colors"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
        {open ? 'Close estimator' : 'Estimate with AI'}
      </button>

      {open && (
        <div className="mt-3 bg-bg-elevated rounded-xl p-3 space-y-2.5">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder={`Describe the scope of work for "${projectTitle}"…`}
            className="w-full bg-bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
          />
          <button
            onClick={handleEstimate}
            disabled={loading}
            className="w-full py-1.5 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base transition-colors disabled:opacity-50"
          >
            {loading ? 'Estimating…' : 'Get AI Estimate'}
          </button>

          {error && <p className="text-xs text-danger">{error}</p>}

          {result && (
            <div className="space-y-1.5 border-t border-border pt-2.5">
              {result.breakdown?.map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-text-secondary">{item.item}</span>
                  <span className="text-text-primary font-medium">${Number(item.amount_cad).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                <span className="text-text-primary">Total</span>
                <span className="text-accent">${Number(result.total_cad).toLocaleString()}</span>
              </div>
              {result.notes && (
                <p className="text-xs text-text-muted leading-relaxed">{result.notes}</p>
              )}
              <button
                onClick={applyEstimate}
                className="w-full py-1.5 rounded-lg text-sm font-semibold bg-success/10 text-success hover:bg-success/20 border border-success/20 transition-colors"
              >
                Apply ${Number(result.total_cad).toLocaleString()} to estimate
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
