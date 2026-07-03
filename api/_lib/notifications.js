/**
 * Alert + digest logic for the daily cron. All queries run with the
 * service-role client passed in from the handler.
 */

import { sendEmail, emailShell, sectionHtml, emailConfigured } from './email.js'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const REALERT_DAYS = 3 // due/overdue items re-alert at most every N days

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function money(n) {
  return `$${Number(n).toLocaleString('en-CA', { maximumFractionDigits: 0 })}`
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function runAlerts(sb, todayIso, generatedToday = []) {
  if (!emailConfigured()) return { skipped: true, reason: 'email not configured' }

  // Recent sends, for dedupe / re-alert throttling
  const { data: recentLog } = await sb
    .from('notification_log')
    .select('kind, entity_id, sent_on')
    .gte('sent_on', addDays(todayIso, -30))
  const lastSent = new Map()
  for (const row of recentLog ?? []) {
    const key = `${row.kind}:${row.entity_id}`
    if (!lastSent.has(key) || lastSent.get(key) < row.sent_on) lastSent.set(key, row.sent_on)
  }
  const shouldSend = (kind, id, throttleDays = 0) => {
    const prev = lastSent.get(`${kind}:${id}`)
    if (!prev) return true
    return throttleDays > 0 ? addDays(prev, throttleDays) <= todayIso : prev < todayIso
  }

  // Active projects with spend for due/overdue/budget checks
  const { data: projects, error } = await sb
    .from('projects')
    .select('id, title, status, due_date, estimate_cad, properties(name), spend_entries(amount_cad)')
    .eq('is_template', false)
    .is('deleted_at', null)
    .neq('status', 'Done')
  if (error) throw new Error(error.message)

  const dueSoon = []
  const overdue = []
  const budget = []
  const soonCutoff = addDays(todayIso, 3)

  for (const p of projects ?? []) {
    const label = `<strong style="color:#f9fafb;">${esc(p.title)}</strong>${p.properties?.name ? ` <span style="color:#4b5563;">· ${esc(p.properties.name)}</span>` : ''}`
    if (p.due_date && p.due_date < todayIso && shouldSend('overdue', p.id, REALERT_DAYS)) {
      overdue.push({ id: p.id, kind: 'overdue', html: `${label} — was due ${p.due_date}` })
    } else if (p.due_date && p.due_date >= todayIso && p.due_date <= soonCutoff && shouldSend('due', p.id, REALERT_DAYS)) {
      dueSoon.push({ id: p.id, kind: 'due', html: `${label} — due ${p.due_date}` })
    }
    const estimate = Number(p.estimate_cad ?? 0)
    if (estimate > 0) {
      const spent = p.spend_entries?.reduce((s, e) => s + Number(e.amount_cad), 0) ?? 0
      if (spent >= estimate * 0.9 && shouldSend('budget', p.id)) {
        const pct = Math.round((spent / estimate) * 100)
        budget.push({ id: p.id, kind: 'budget', html: `${label} — ${money(spent)} of ${money(estimate)} (${pct}%)` })
      }
    }
  }

  // Documents expiring within 30 days (table exists from migration 012)
  const docItems = []
  const { data: docs } = await sb
    .from('documents')
    .select('id, title, doc_type, expires_on, properties(name)')
    .not('expires_on', 'is', null)
    .gte('expires_on', todayIso)
    .lte('expires_on', addDays(todayIso, 30))
  for (const d of docs ?? []) {
    if (!shouldSend('doc_expiry', d.id, 7)) continue
    docItems.push({
      id: d.id,
      kind: 'doc_expiry',
      html: `<strong style="color:#f9fafb;">${esc(d.title)}</strong> <span style="color:#4b5563;">(${esc(d.doc_type)}${d.properties?.name ? ` · ${esc(d.properties.name)}` : ''})</span> — expires ${d.expires_on}`,
    })
  }

  const generatedItems = generatedToday.map(g => ({
    id: null, kind: null,
    html: `<strong style="color:#f9fafb;">${esc(g.project)}</strong> — due ${g.due}`,
  }))

  const alertCount = overdue.length + dueSoon.length + budget.length + docItems.length
  if (alertCount === 0 && generatedItems.length === 0) {
    return { sent: false, reason: 'nothing to report' }
  }

  const body = [
    sectionHtml('⚠ Overdue', overdue.map(i => i.html)),
    sectionHtml('Due soon', dueSoon.map(i => i.html)),
    sectionHtml('Budget over 90%', budget.map(i => i.html)),
    sectionHtml('Documents expiring', docItems.map(i => i.html)),
    sectionHtml('Maintenance generated today', generatedItems.map(i => i.html)),
  ].filter(Boolean).join('\n')

  await sendEmail({
    subject: `Home Projects — ${alertCount || generatedItems.length} item${(alertCount || generatedItems.length) === 1 ? '' : 's'} need attention`,
    html: emailShell(`Daily check · ${todayIso}`, body),
  })

  const logRows = [...overdue, ...dueSoon, ...budget, ...docItems]
    .filter(i => i.id)
    .map(i => ({ kind: i.kind, entity_id: i.id, sent_on: todayIso }))
  if (logRows.length) {
    await sb.from('notification_log').upsert(logRows, { onConflict: 'kind,entity_id,sent_on', ignoreDuplicates: true })
  }

  return { sent: true, counts: { overdue: overdue.length, dueSoon: dueSoon.length, budget: budget.length, docs: docItems.length } }
}

// ── Weekly digest (Mondays) ──────────────────────────────────────────────────

export async function runWeeklyDigest(sb, todayIso) {
  if (!emailConfigured()) return { skipped: true, reason: 'email not configured' }
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  const { data: projects, error } = await sb
    .from('projects')
    .select('title, status, priority, due_date, estimate_cad, notes, properties(name), spend_entries(amount_cad, entry_date)')
    .eq('is_template', false)
    .is('deleted_at', null)
  if (error) throw new Error(error.message)

  // Stats for the table section
  const weekAgo = addDays(todayIso, -7)
  const spendByProperty = {}
  let weekSpend = 0
  for (const p of projects ?? []) {
    for (const e of p.spend_entries ?? []) {
      if (e.entry_date >= weekAgo && e.entry_date <= todayIso) {
        const prop = p.properties?.name ?? 'No property'
        spendByProperty[prop] = (spendByProperty[prop] ?? 0) + Number(e.amount_cad)
        weekSpend += Number(e.amount_cad)
      }
    }
  }
  const overdue = (projects ?? []).filter(p => p.due_date && p.due_date < todayIso && p.status !== 'Done')
  const inProgress = (projects ?? []).filter(p => p.status === 'In Progress')

  // AI narrative — same prompt as the in-app weekly summary button
  let narrative = ''
  if (anthropicKey) {
    try {
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          system: `You are a home project assistant writing a weekly summary for the homeowner. Be direct and practical. Structure: what's in progress, what's overdue and needs attention, what was recently completed, current budget status. Use plain English, not bullet points. Keep it under 200 words.`,
          messages: [{ role: 'user', content: JSON.stringify(projects?.map(p => ({
            title: p.title, status: p.status, priority: p.priority, due_date: p.due_date,
            property: p.properties?.name, estimate_cad: p.estimate_cad, notes: p.notes,
          }))) }],
        }),
      })
      const data = await res.json()
      narrative = data.content?.find(b => b.type === 'text')?.text ?? ''
    } catch (e) {
      narrative = `(AI summary unavailable: ${e.message})`
    }
  }

  const statsRows = Object.entries(spendByProperty)
    .map(([name, amt]) => `<tr><td style="padding:4px 12px 4px 0;color:#9ca3af;">${esc(name)}</td><td style="padding:4px 0;color:#f9fafb;text-align:right;">${money(amt)}</td></tr>`)
    .join('')

  const body = `
${narrative ? `<p style="color:#e5e7eb;white-space:pre-wrap;">${esc(narrative)}</p>` : ''}
<h2 style="color:#f9fafb;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;margin:18px 0 8px;">This week</h2>
<table style="border-collapse:collapse;width:100%;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;color:#9ca3af;">Spend (7 days)</td><td style="padding:4px 0;color:#f9fafb;text-align:right;">${money(weekSpend)}</td></tr>
  ${statsRows}
  <tr><td style="padding:4px 12px 4px 0;color:#9ca3af;">In progress</td><td style="padding:4px 0;color:#f9fafb;text-align:right;">${inProgress.length}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#9ca3af;">Overdue</td><td style="padding:4px 0;color:${overdue.length ? '#ef4444' : '#22c55e'};text-align:right;">${overdue.length}</td></tr>
</table>
${sectionHtml('Overdue projects', overdue.map(p => `<strong style="color:#f9fafb;">${esc(p.title)}</strong> — was due ${p.due_date}`))}`

  await sendEmail({
    subject: `Home Projects — weekly digest (${todayIso})`,
    html: emailShell(`Weekly digest · ${todayIso}`, body),
  })

  return { sent: true }
}
