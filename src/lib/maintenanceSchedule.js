// Pure date logic for the maintenance engine. Due dates are always the 1st
// of a month, computed as ISO strings (YYYY-MM-DD) to avoid timezone drift.
// Used by both the /maintenance UI and the daily cron generator.

// Which months (1-12) a plan is due in.
export function anchorMonths(plan) {
  const a = plan.anchor_month ?? 1
  switch (plan.cadence) {
    case 'monthly':
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    case 'quarterly': {
      // every 3 months, phased by the anchor (e.g. anchor 2 → Feb/May/Aug/Nov)
      const phase = ((a - 1) % 3)
      return [phase + 1, phase + 4, phase + 7, phase + 10]
    }
    case 'biannual': {
      const second = ((a - 1 + 6) % 12) + 1
      return [a, second].sort((x, y) => x - y)
    }
    case 'annual':
      return [a]
    default:
      return []
  }
}

function iso(year, month) {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

// Earliest due date (1st of an anchor month) strictly after `afterIso`.
export function nextDueDate(plan, afterIso = null) {
  const months = anchorMonths(plan)
  if (!months.length) return null
  const floor = afterIso ?? '1970-01-01'
  const [fy, fm] = floor.split('-').map(Number)
  // scan up to 25 months forward from the floor month
  for (let i = 0; i <= 24; i++) {
    const m = ((fm - 1 + i) % 12) + 1
    const y = fy + Math.floor((fm - 1 + i) / 12)
    if (!months.includes(m)) continue
    const candidate = iso(y, m)
    if (candidate > floor) return candidate
  }
  return null
}

export function addDaysIso(dateIso, days) {
  const d = new Date(`${dateIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// If the plan should generate a project today, returns the due date to use;
// otherwise null. A project generates once per due date (last_generated_due
// is the dedupe guard) starting lead_days before the due date. Missed cron
// runs still generate — the project just lands already-overdue.
export function shouldGenerate(plan, todayIso) {
  if (plan.active === false) return null
  const due = nextDueDate(plan, plan.last_generated_due ?? null)
  if (!due) return null
  const generateFrom = addDaysIso(due, -(plan.lead_days ?? 14))
  return todayIso >= generateFrom ? due : null
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "Furnace filter — Mar 2027" style suffix for generated project titles
export function dueLabel(dueIso) {
  const [y, m] = dueIso.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}
