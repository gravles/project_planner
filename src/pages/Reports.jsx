import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { parseISO, getMonth, getYear, format } from 'date-fns'
import AppShell from '../components/layout/AppShell'
import { useProjects } from '../hooks/useProjects'
import { useProperties } from '../hooks/useProperties'
import { groupBy } from '../lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const tooltipStyle = {
  contentStyle: { backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', fontSize: '12px' },
  labelStyle: { color: '#9ca3af' },
  itemStyle: { color: '#f59e0b' },
}

function fmt(n) { return '$' + Number(n).toLocaleString() }

export default function Reports() {
  const { data: projects = [] } = useProjects()
  const { data: properties = [] } = useProperties()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [propertyFilter, setPropertyFilter] = useState('all')

  const yearRange = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]

  const filtered = useMemo(() =>
    propertyFilter === 'all' ? projects : projects.filter(p => p.property_id === propertyFilter)
  , [projects, propertyFilter])

  // All spend entries across filtered projects
  const allEntries = useMemo(() =>
    filtered.flatMap(p => (p.spend_entries ?? []).map(e => ({ ...e, project: p })))
  , [filtered])

  // Per-property summary
  const propertySummary = useMemo(() =>
    properties.map(prop => {
      const pProjects = projects.filter(p => p.property_id === prop.id)
      const totalEstimate = pProjects.reduce((s, p) => s + Number(p.estimate_cad ?? 0), 0)
      const totalSpend = pProjects.flatMap(p => p.spend_entries ?? []).reduce((s, e) => s + Number(e.amount_cad), 0)
      return { name: prop.name, projectCount: pProjects.length, totalEstimate, totalSpend }
    })
  , [projects, properties])

  // Monthly spend for selected year
  const monthlyData = useMemo(() => {
    const byMonth = Array.from({ length: 12 }, (_, i) => ({ month: MONTHS[i], spend: 0 }))
    allEntries.forEach(e => {
      if (!e.entry_date) return
      const d = parseISO(e.entry_date)
      if (getYear(d) !== year) return
      byMonth[getMonth(d)].spend += Number(e.amount_cad)
    })
    return byMonth
  }, [allEntries, year])

  // Spend by room
  const roomData = useMemo(() => {
    const byRoom = {}
    filtered.forEach(p => {
      const room = p.room || 'Unassigned'
      const spend = (p.spend_entries ?? []).reduce((s, e) => s + Number(e.amount_cad), 0)
      byRoom[room] = (byRoom[room] ?? 0) + spend
    })
    return Object.entries(byRoom)
      .map(([room, spend]) => ({ room, spend }))
      .filter(r => r.spend > 0)
      .sort((a, b) => b.spend - a.spend)
  }, [filtered])

  // Totals
  const totalEstimate = filtered.reduce((s, p) => s + Number(p.estimate_cad ?? 0), 0)
  const totalSpend = allEntries.reduce((s, e) => s + Number(e.amount_cad), 0)
  const yearSpend = allEntries.filter(e => {
    if (!e.entry_date) return false
    return getYear(parseISO(e.entry_date)) === year
  }).reduce((s, e) => s + Number(e.amount_cad), 0)

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-text-primary">Reports</h1>
            <p className="text-sm text-text-muted mt-0.5">Spend analysis across all properties</p>
          </div>
          <select
            value={propertyFilter}
            onChange={e => setPropertyFilter(e.target.value)}
            className="bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="all">All properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-bg-surface border border-border rounded-2xl p-4">
            <p className="text-xs text-text-muted mb-1">Total projects</p>
            <p className="text-2xl font-bold text-text-primary">{filtered.length}</p>
          </div>
          <div className="bg-bg-surface border border-border rounded-2xl p-4">
            <p className="text-xs text-text-muted mb-1">Total estimated</p>
            <p className="text-2xl font-bold text-text-primary">{fmt(totalEstimate)}</p>
          </div>
          <div className="bg-bg-surface border border-border rounded-2xl p-4">
            <p className="text-xs text-text-muted mb-1">Total spent</p>
            <p className="text-2xl font-bold text-accent">{fmt(totalSpend)}</p>
            {totalEstimate > 0 && (
              <p className="text-xs text-text-muted mt-0.5">{Math.round(totalSpend / totalEstimate * 100)}% of estimate</p>
            )}
          </div>
        </div>

        {/* Per-property table */}
        <div className="bg-bg-surface border border-border rounded-2xl p-5">
          <h2 className="font-display text-base font-bold text-text-primary mb-4">By Property</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-muted border-b border-border">
                <th className="text-left pb-2 font-medium">Property</th>
                <th className="text-right pb-2 font-medium">Projects</th>
                <th className="text-right pb-2 font-medium">Estimated</th>
                <th className="text-right pb-2 font-medium">Spent</th>
                <th className="text-right pb-2 font-medium">% Used</th>
              </tr>
            </thead>
            <tbody>
              {propertySummary.map(row => (
                <tr key={row.name} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 text-text-primary font-medium">{row.name}</td>
                  <td className="py-2.5 text-right text-text-secondary">{row.projectCount}</td>
                  <td className="py-2.5 text-right text-text-secondary">{fmt(row.totalEstimate)}</td>
                  <td className="py-2.5 text-right text-text-primary">{fmt(row.totalSpend)}</td>
                  <td className="py-2.5 text-right">
                    {row.totalEstimate > 0 ? (
                      <span className={row.totalSpend > row.totalEstimate ? 'text-danger' : 'text-success'}>
                        {Math.round(row.totalSpend / row.totalEstimate * 100)}%
                      </span>
                    ) : <span className="text-text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Monthly spend chart */}
        <div className="bg-bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-text-primary">Monthly Spend</h2>
              <p className="text-xs text-text-muted mt-0.5">{fmt(yearSpend)} in {year}</p>
            </div>
            <div className="flex gap-1">
              {yearRange.map(y => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${y === year ? 'bg-accent text-bg-base font-semibold' : 'text-text-muted hover:text-text-primary'}`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
          {monthlyData.some(d => d.spend > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <Tooltip {...tooltipStyle} formatter={v => [fmt(v), 'Spend']} />
                <Bar dataKey="spend" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">
              No spend entries for {year}
            </div>
          )}
        </div>

        {/* Spend by room */}
        {roomData.length > 0 && (
          <div className="bg-bg-surface border border-border rounded-2xl p-5">
            <h2 className="font-display text-base font-bold text-text-primary mb-4">Spend by Room</h2>
            <ResponsiveContainer width="100%" height={Math.max(180, roomData.length * 36)}>
              <BarChart data={roomData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <YAxis type="category" dataKey="room" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip {...tooltipStyle} formatter={v => [fmt(v), 'Spend']} />
                <Bar dataKey="spend" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </AppShell>
  )
}
