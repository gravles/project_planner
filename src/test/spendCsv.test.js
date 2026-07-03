import { describe, it, expect } from 'vitest'
import { csvEscape, spendRowsForYear, buildSpendCsv, categoryTotalsForYear } from '../lib/spendCsv'

const projects = [
  {
    title: 'Deck rebuild',
    vendor: 'Home Depot',
    properties: { name: 'Olmstead' },
    spend_entries: [
      { entry_date: '2026-03-10', amount_cad: 250.5, note: 'Lumber, 2x6', category: 'materials', expense_type: 'capital', receipt_url: null },
      { entry_date: '2026-06-01', amount_cad: 100, note: null, category: 'tools', expense_type: null, receipt_url: 'https://x.com/r' },
      { entry_date: '2025-12-31', amount_cad: 999, note: 'last year', category: 'materials', expense_type: 'capital' },
    ],
  },
  {
    title: 'Furnace fix, "urgent"',
    vendor: null,
    properties: null,
    spend_entries: [
      { entry_date: '2026-01-05', amount_cad: 400, note: 'service call', category: 'maintenance_repair', expense_type: 'current' },
    ],
  },
]

describe('csvEscape', () => {
  it('passes plain values through', () => {
    expect(csvEscape('hello')).toBe('hello')
    expect(csvEscape(42)).toBe('42')
    expect(csvEscape(null)).toBe('')
  })

  it('quotes values with commas, quotes, and newlines', () => {
    expect(csvEscape('a,b')).toBe('"a,b"')
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""')
    expect(csvEscape('two\nlines')).toBe('"two\nlines"')
  })
})

describe('spendRowsForYear', () => {
  it('filters to the requested year and sorts by date', () => {
    const rows = spendRowsForYear(projects, 2026)
    expect(rows).toHaveLength(3)
    expect(rows.map(r => r.date)).toEqual(['2026-01-05', '2026-03-10', '2026-06-01'])
  })

  it('flattens project context into each row', () => {
    const rows = spendRowsForYear(projects, 2026)
    const lumber = rows.find(r => r.note === 'Lumber, 2x6')
    expect(lumber.project).toBe('Deck rebuild')
    expect(lumber.property).toBe('Olmstead')
    expect(lumber.vendor).toBe('Home Depot')
    expect(lumber.category).toBe('Materials')
    expect(lumber.expense_type).toBe('capital')
    expect(lumber.amount_cad).toBe('250.50')
  })

  it('marks entries without expense_type as unclassified', () => {
    const rows = spendRowsForYear(projects, 2026)
    expect(rows.find(r => r.category === 'Tools').expense_type).toBe('unclassified')
  })
})

describe('buildSpendCsv', () => {
  it('produces a header plus one line per row, with quoting intact', () => {
    const csv = buildSpendCsv(spendRowsForYear(projects, 2026))
    const lines = csv.split('\r\n')
    expect(lines).toHaveLength(4)
    expect(lines[0]).toBe('date,project,property,vendor,category,expense_type,amount_cad,note,receipt_url')
    expect(lines[1]).toContain('"Furnace fix, ""urgent"""')
    expect(lines[2]).toContain('"Lumber, 2x6"')
  })
})

describe('categoryTotalsForYear', () => {
  it('splits totals by capital/current/unclassified and sorts by total', () => {
    const totals = categoryTotalsForYear(projects, 2026)
    expect(totals[0]).toEqual({ category: 'maintenance_repair', capital: 0, current: 400, unclassified: 0, total: 400 })
    expect(totals.find(t => t.category === 'materials')).toEqual({ category: 'materials', capital: 250.5, current: 0, unclassified: 0, total: 250.5 })
    expect(totals.find(t => t.category === 'tools').unclassified).toBe(100)
  })
})
