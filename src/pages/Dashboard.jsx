import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { isAfter, parseISO, startOfDay } from 'date-fns'
import AppShell from '../components/layout/AppShell'
import ProjectDetail from '../components/projects/ProjectDetail'
import { useProjects } from '../hooks/useProjects'
import { useProperties } from '../hooks/useProperties'
import { generateWeeklySummary } from '../lib/anthropic'
import { useUIStore } from '../stores/uiStore'
import { cn, STATUS_COLORS, PROPERTY_COLORS, formatDate } from '../lib/utils'

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className="bg-bg-surface border border-border rounded-2xl px-5 py-4">
      <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">{label}</p>
      <p className={cn('text-3xl font-bold font-display', accent ? 'text-accent' : 'text-text-primary')}>
        {value}
      </p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  )
}

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-elevated border border-border rounded-xl px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-text-primary mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.fill }} className="text-xs">
          {p.name}: {p.name.includes('$') || p.name.toLowerCase().includes('budget') || p.name.toLowerCase().includes('spent') || p.name.toLowerCase().includes('estimate')
            ? `$${Number(p.value).toLocaleString()}`
            : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { data: projects = [], isLoading } = useProjects()
  const { data: properties = [] } = useProperties()
  const { detailProjectId, openDetail, closeDetail } = useUIStore()
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // ── Stats ──────────────────────────────────────────────────────────────────
  const total = projects.length
  const inProgress = projects.filter(p => p.status === 'In Progress').length
  const blocked = projects.filter(p => p.status === 'Blocked').length
  const done = projects.filter(p => p.status === 'Done').length
  const totalBudget = projects.reduce((s, p) => s + Number(p.estimate_cad ?? 0), 0)
  const totalSpent = projects.reduce((s, p) => {
    return s + (p.spend_entries?.reduce((a, e) => a + Number(e.amount_cad), 0) ?? 0)
  }, 0)

  // ── Per-property breakdown ─────────────────────────────────────────────────
  const propertyData = properties.map(prop => {
    const propProjects = projects.filter(p => p.properties?.name === prop.name)
    const estimate = propProjects.reduce((s, p) => s + Number(p.estimate_cad ?? 0), 0)
    const spent = propProjects.reduce((s, p) => s + (p.spend_entries?.reduce((a, e) => a + Number(e.amount_cad), 0) ?? 0), 0)
    return {
      name: prop.name,
      Projects: propProjects.length,
      Estimate: estimate,
      Spent: spent,
      color: prop.color,
    }
  })

  // ── Overdue ────────────────────────────────────────────────────────────────
  const today = startOfDay(new Date())
  const overdueProjects = projects.filter(p =>
    p.due_date && p.status !== 'Done' && isAfter(today, parseISO(p.due_date))
  ).sort((a, b) => new Date(a.due_date) - new Date(b.due_date))

  // ── Status breakdown ───────────────────────────────────────────────────────
  const statusData = ['Backlog', 'In Progress', 'Blocked', 'Done'].map(s => ({
    name: s,
    count: projects.filter(p => p.status === s).length,
  }))

  async function handleWeeklySummary() {
    setSummaryLoading(true)
    setSummary(null)
    try {
      const text = await generateWeeklySummary(
        projects.map(p => ({
          title: p.title,
          status: p.status,
          priority: p.priority,
          due_date: p.due_date,
          property: p.properties?.name,
          estimate_cad: p.estimate_cad,
          notes: p.notes,
        }))
      )
      setSummary(text)
    } catch {
      setSummary('Could not generate summary. Check your API key.')
    } finally {
      setSummaryLoading(false)
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-5xl space-y-4 sm:space-y-6 overflow-y-auto flex-1 scrollbar-thin">

        {/* ── Overdue alert ── */}
        {overdueProjects.length > 0 && (
          <div className="bg-danger/10 border border-danger/30 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p className="text-xs font-semibold text-danger uppercase tracking-wider">
                {overdueProjects.length} Overdue {overdueProjects.length === 1 ? 'Project' : 'Projects'}
              </p>
            </div>
            <div className="space-y-2">
              {overdueProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => openDetail(p.id)}
                  className="w-full flex items-center justify-between gap-3 text-left hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {p.properties?.color && (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.properties.color }} />
                    )}
                    <span className="text-sm text-text-primary font-medium truncate">{p.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-danger">{formatDate(p.due_date)}</span>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_COLORS[p.status])}>{p.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Projects" value={total} />
          <StatCard label="In Progress" value={inProgress} accent />
          <StatCard label="Blocked" value={blocked} sub={blocked > 0 ? 'needs attention' : 'all clear'} />
          <StatCard
            label="Budget"
            value={`$${totalBudget.toLocaleString()}`}
            sub={totalSpent > 0 ? `$${totalSpent.toLocaleString()} spent` : 'no spend recorded'}
          />
        </div>

        {/* ── Charts row ── */}
        {properties.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By property */}
            <div className="bg-bg-surface border border-border rounded-2xl px-5 py-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Projects by Property</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={propertyData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="Projects" radius={[4, 4, 0, 0]}>
                    {propertyData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Budget by property */}
            <div className="bg-bg-surface border border-border rounded-2xl px-5 py-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Budget by Property (CAD)</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={propertyData} barSize={14}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="Estimate" radius={[4, 4, 0, 0]} fill="#f59e0b" opacity={0.7} />
                  <Bar dataKey="Spent" radius={[4, 4, 0, 0]} fill="#60a5fa" opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Status breakdown ── */}
        <div className="bg-bg-surface border border-border rounded-2xl px-5 py-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Status Breakdown</p>
          <div className="flex items-end gap-3 flex-wrap">
            {statusData.map(({ name, count }) => (
              <div key={name} className="flex items-center gap-2">
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[name])}>
                  {name}
                </span>
                <span className="text-sm font-bold text-text-primary">{count}</span>
              </div>
            ))}
            <div className="flex-1" />
            {done > 0 && (
              <p className="text-xs text-text-muted">
                {Math.round((done / total) * 100)}% complete
              </p>
            )}
          </div>
        </div>

        {/* ── AI Weekly Summary ── */}
        <div className="bg-bg-surface border border-border rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Weekly Summary</p>
            <button
              onClick={handleWeeklySummary}
              disabled={summaryLoading || projects.length === 0}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-amber-300 transition-colors disabled:opacity-50"
            >
              {summaryLoading ? (
                <>
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                  </svg>
                  Generating…
                </>
              ) : 'Generate with AI'}
            </button>
          </div>
          {summary ? (
            <p className="text-sm text-text-secondary leading-relaxed">{summary}</p>
          ) : (
            <p className="text-sm text-text-muted">
              {projects.length === 0
                ? 'Add some projects first.'
                : 'Click "Generate with AI" for a plain-English summary of your project status.'}
            </p>
          )}
        </div>

      </div>

      <AnimatePresence>
        {detailProjectId && (
          <ProjectDetail key={detailProjectId} projectId={detailProjectId} onClose={closeDetail} />
        )}
      </AnimatePresence>

    </AppShell>
  )
}
