// Year-end spend export — pure functions so the format is unit-testable.
// Output is accountant-friendly: one row per spend entry with the project,
// property, vendor, category, and capital/current classification.

import { SPEND_CATEGORY_LABELS } from './utils'

export function csvEscape(value) {
  const s = String(value ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Flattens projects (with nested spend_entries) into export rows for a year.
export function spendRowsForYear(projects, year) {
  const rows = []
  for (const p of projects) {
    for (const e of p.spend_entries ?? []) {
      if (!e.entry_date || !e.entry_date.startsWith(String(year))) continue
      rows.push({
        date: e.entry_date,
        project: p.title,
        property: p.properties?.name ?? '',
        vendor: p.vendor ?? '',
        category: SPEND_CATEGORY_LABELS[e.category] ?? e.category ?? 'Other',
        expense_type: e.expense_type ?? 'unclassified',
        amount_cad: Number(e.amount_cad).toFixed(2),
        note: e.note ?? '',
        receipt_url: e.receipt_url ?? '',
      })
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date))
}

const HEADER = ['date', 'project', 'property', 'vendor', 'category', 'expense_type', 'amount_cad', 'note', 'receipt_url']

export function buildSpendCsv(rows) {
  const lines = [HEADER.join(',')]
  for (const row of rows) {
    lines.push(HEADER.map(k => csvEscape(row[k])).join(','))
  }
  return lines.join('\r\n')
}

// Category × expense-type totals for the report table
export function categoryTotalsForYear(projects, year) {
  const totals = {}
  for (const p of projects) {
    for (const e of p.spend_entries ?? []) {
      if (!e.entry_date || !e.entry_date.startsWith(String(year))) continue
      const cat = e.category ?? 'other'
      if (!totals[cat]) totals[cat] = { capital: 0, current: 0, unclassified: 0, total: 0 }
      const bucket = e.expense_type === 'capital' ? 'capital' : e.expense_type === 'current' ? 'current' : 'unclassified'
      totals[cat][bucket] += Number(e.amount_cad)
      totals[cat].total += Number(e.amount_cad)
    }
  }
  return Object.entries(totals)
    .map(([category, t]) => ({ category, ...t }))
    .sort((a, b) => b.total - a.total)
}
