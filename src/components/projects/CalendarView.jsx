import { useState } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, format, addMonths, subMonths, isToday as isTodayFn,
} from 'date-fns'
import { cn, isOverdue } from '../../lib/utils'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarView({ projects, onOpen }) {
  const [current, setCurrent] = useState(new Date())

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = getDay(monthStart)

  const cells = [...Array(startPad).fill(null), ...days]
  while (cells.length % 7 !== 0) cells.push(null)

  // Map 'YYYY-MM-DD' → projects[]
  const byDate = {}
  projects.forEach(p => {
    if (!p.due_date) return
    const key = p.due_date.split('T')[0]
    ;(byDate[key] = byDate[key] ?? []).push(p)
  })

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
      {/* Month navigation */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => setCurrent(subMonths(current, 1))}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="font-display text-lg font-bold text-text-primary w-44 text-center">
          {format(current, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setCurrent(addMonths(current, 1))}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <button
          onClick={() => setCurrent(new Date())}
          className="text-xs text-accent hover:text-amber-300 transition-colors px-2.5 py-1 rounded-lg hover:bg-bg-elevated"
        >
          Today
        </button>
        <div className="ml-auto flex gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-danger/60" /> Overdue
          </span>
          <span>{projects.filter(p => p.due_date).length} projects with due dates</span>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-[11px] font-semibold text-text-muted text-center py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} className="min-h-[96px] rounded-xl" />

          const dateKey = format(day, 'yyyy-MM-dd')
          const dayProjects = byDate[dateKey] ?? []
          const today = isTodayFn(day)

          return (
            <div
              key={dateKey}
              className={cn(
                'min-h-[96px] rounded-xl p-1.5 border transition-colors',
                today
                  ? 'border-accent/50 bg-accent/5'
                  : 'border-border bg-bg-surface hover:border-border-hover',
              )}
            >
              <div className={cn(
                'text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full mx-auto',
                today ? 'bg-accent text-bg-base' : 'text-text-muted',
              )}>
                {format(day, 'd')}
              </div>

              <div className="space-y-0.5">
                {dayProjects.slice(0, 3).map(p => {
                  const over = isOverdue(p.due_date) && p.status !== 'Done'
                  return (
                    <button
                      key={p.id}
                      onClick={() => onOpen(p.id)}
                      title={p.title}
                      className="w-full text-left text-[10px] px-1.5 py-0.5 rounded-md truncate transition-opacity hover:opacity-75 leading-tight"
                      style={{
                        backgroundColor: over ? '#ef444420' : `${p.properties?.color ?? '#818cf8'}22`,
                        color: over ? '#ef4444' : (p.properties?.color ?? '#818cf8'),
                      }}
                    >
                      {p.title}
                    </button>
                  )
                })}
                {dayProjects.length > 3 && (
                  <div className="text-[10px] text-text-muted px-1">
                    +{dayProjects.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
