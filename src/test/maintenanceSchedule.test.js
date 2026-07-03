import { describe, it, expect } from 'vitest'
import { anchorMonths, nextDueDate, addDaysIso, shouldGenerate, dueLabel } from '../lib/maintenanceSchedule'

describe('anchorMonths', () => {
  it('monthly covers all months', () => {
    expect(anchorMonths({ cadence: 'monthly' })).toHaveLength(12)
  })

  it('quarterly is phased by anchor month', () => {
    expect(anchorMonths({ cadence: 'quarterly', anchor_month: 1 })).toEqual([1, 4, 7, 10])
    expect(anchorMonths({ cadence: 'quarterly', anchor_month: 2 })).toEqual([2, 5, 8, 11])
    expect(anchorMonths({ cadence: 'quarterly', anchor_month: 5 })).toEqual([2, 5, 8, 11])
  })

  it('biannual is anchor + 6 months, wrapping the year', () => {
    expect(anchorMonths({ cadence: 'biannual', anchor_month: 5 })).toEqual([5, 11])
    expect(anchorMonths({ cadence: 'biannual', anchor_month: 10 })).toEqual([4, 10])
  })

  it('annual is just the anchor', () => {
    expect(anchorMonths({ cadence: 'annual', anchor_month: 9 })).toEqual([9])
  })
})

describe('nextDueDate', () => {
  it('monthly: first of the next month after the floor', () => {
    expect(nextDueDate({ cadence: 'monthly' }, '2026-07-01')).toBe('2026-08-01')
    expect(nextDueDate({ cadence: 'monthly' }, '2026-07-15')).toBe('2026-08-01')
  })

  it('monthly rolls over the year end', () => {
    expect(nextDueDate({ cadence: 'monthly' }, '2026-12-01')).toBe('2027-01-01')
  })

  it('is strictly after the floor (same-day floor excluded)', () => {
    expect(nextDueDate({ cadence: 'annual', anchor_month: 7 }, '2026-07-01')).toBe('2027-07-01')
  })

  it('annual with no prior generation returns the next occurrence', () => {
    expect(nextDueDate({ cadence: 'annual', anchor_month: 5 }, null)).toBe('1970-05-01')
    // realistic: floor at today
    expect(nextDueDate({ cadence: 'annual', anchor_month: 5 }, '2026-07-03')).toBe('2027-05-01')
    expect(nextDueDate({ cadence: 'annual', anchor_month: 9 }, '2026-07-03')).toBe('2026-09-01')
  })

  it('quarterly picks the next anchor month', () => {
    expect(nextDueDate({ cadence: 'quarterly', anchor_month: 1 }, '2026-07-03')).toBe('2026-10-01')
    expect(nextDueDate({ cadence: 'quarterly', anchor_month: 2 }, '2026-11-02')).toBe('2027-02-01')
  })

  it('biannual wraps the year', () => {
    expect(nextDueDate({ cadence: 'biannual', anchor_month: 10 }, '2026-10-01')).toBe('2027-04-01')
  })
})

describe('addDaysIso', () => {
  it('adds and subtracts days across month boundaries', () => {
    expect(addDaysIso('2026-03-01', -14)).toBe('2026-02-15')
    expect(addDaysIso('2026-12-25', 10)).toBe('2027-01-04')
  })
})

describe('shouldGenerate', () => {
  const plan = { cadence: 'quarterly', anchor_month: 1, lead_days: 14, last_generated_due: '2026-04-01' }

  it('does not generate before the lead window', () => {
    // next due 2026-07-01, window opens 2026-06-17
    expect(shouldGenerate(plan, '2026-06-16')).toBeNull()
  })

  it('generates once the lead window opens', () => {
    expect(shouldGenerate(plan, '2026-06-17')).toBe('2026-07-01')
    expect(shouldGenerate(plan, '2026-07-01')).toBe('2026-07-01')
  })

  it('still generates when the cron missed the window (lands overdue)', () => {
    expect(shouldGenerate(plan, '2026-08-20')).toBe('2026-07-01')
  })

  it('does not regenerate the same due date', () => {
    const generated = { ...plan, last_generated_due: '2026-07-01' }
    // next due is now 2026-10-01; window opens 2026-09-17
    expect(shouldGenerate(generated, '2026-07-02')).toBeNull()
    expect(shouldGenerate(generated, '2026-09-17')).toBe('2026-10-01')
  })

  it('respects the active flag', () => {
    expect(shouldGenerate({ ...plan, active: false }, '2026-06-20')).toBeNull()
  })

  it('uses default lead_days of 14 when unset', () => {
    const p = { cadence: 'annual', anchor_month: 8, last_generated_due: null }
    expect(shouldGenerate(p, '1970-07-17')).toBeNull()
    expect(shouldGenerate(p, '1970-07-18')).toBe('1970-08-01')
  })
})

describe('dueLabel', () => {
  it('formats month-year labels', () => {
    expect(dueLabel('2026-07-01')).toBe('Jul 2026')
    expect(dueLabel('2027-01-01')).toBe('Jan 2027')
  })
})
