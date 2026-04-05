import { useState } from 'react'
import { estimateTime } from '../../lib/anthropic'
import { useUpdateProject } from '../../hooks/useProjects'
import { toast } from '../../stores/toastStore'

export default function AiTimeEstimator({ projectId, projectTitle }) {
  const [open, setOpen]           = useState(false)
  const [description, setDescription] = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState(null)
  const updateProject = useUpdateProject()

  async function handleEstimate() {
    if (!description.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await estimateTime(description || projectTitle)
      setResult(data)
    } catch {
      setError('Could not estimate. Check your Anthropic API key.')
    } finally {
      setLoading(false)
    }
  }

  function applyEstimate() {
    updateProject.mutate({ id: projectId, time_estimate_hours: result.total_hours })
    toast.success(`Time estimate set to ${formatHours(result.total_hours)}`)
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
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        {open ? 'Close estimator' : 'Estimate time with AI'}
      </button>

      {open && (
        <div className="mt-3 bg-bg-elevated rounded-xl p-3 space-y-2.5">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder={`Describe the work for "${projectTitle}"…`}
            className="w-full bg-bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
          />
          <button
            onClick={handleEstimate}
            disabled={loading || !description.trim()}
            className="w-full py-1.5 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base transition-colors disabled:opacity-50"
          >
            {loading ? 'Estimating…' : 'Get Time Estimate'}
          </button>

          {error && <p className="text-xs text-danger">{error}</p>}

          {result && (
            <div className="space-y-1.5 border-t border-border pt-2.5">
              {result.breakdown?.map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-text-secondary">{item.task}</span>
                  <span className="text-text-primary font-medium">{formatHours(item.hours)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                <span className="text-text-primary">Total</span>
                <span className="text-accent">{formatHours(result.total_hours)}</span>
              </div>
              {result.diy_vs_contractor && (
                <p className="text-xs text-text-muted">
                  Recommended: <span className="text-text-secondary font-medium">{result.diy_vs_contractor}</span>
                </p>
              )}
              {result.notes && (
                <p className="text-xs text-text-muted leading-relaxed">{result.notes}</p>
              )}
              <button
                onClick={applyEstimate}
                className="w-full py-1.5 rounded-lg text-sm font-semibold bg-success/10 text-success hover:bg-success/20 border border-success/20 transition-colors"
              >
                Apply {formatHours(result.total_hours)} to project
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatHours(h) {
  const n = Number(h)
  if (n < 1) return `${Math.round(n * 60)} min`
  if (n % 1 === 0) return `${n}h`
  return `${n}h`
}
