/**
 * Daily cron — runs every morning (see vercel.json "crons").
 * 1. Generates projects from active maintenance plans in their lead window.
 * 2. Sends the "attention needed" alert email (due/overdue, budget, expiring docs).
 * 3. On Mondays, sends the AI weekly digest.
 *
 * Auth: Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically
 * when the CRON_SECRET env var is set.
 */

import { createClient } from '@supabase/supabase-js'
import { shouldGenerate, dueLabel } from '../../src/lib/maintenanceSchedule.js'
import { runAlerts, runWeeklyDigest } from '../_lib/notifications.js'

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// Service-role inserts have no auth.uid(); the single user owns everything.
async function getOwnerId(sb) {
  const { data } = await sb.from('profiles').select('id').order('created_at').limit(1).single()
  return data?.id ?? null
}

async function generateMaintenanceProjects(sb, todayIso) {
  const { data: plans, error } = await sb
    .from('maintenance_plans')
    .select('*')
    .eq('active', true)
  if (error) throw new Error(`maintenance_plans query failed: ${error.message}`)

  const ownerId = await getOwnerId(sb)
  const generated = []

  for (const plan of plans ?? []) {
    const due = shouldGenerate(plan, todayIso)
    if (!due) continue

    const { data: project, error: insErr } = await sb.from('projects').insert({
      title: `${plan.title} — ${dueLabel(due)}`,
      property_id: plan.property_id,
      room: plan.room ?? 'Other',
      status: 'Backlog',
      priority: plan.priority ?? 'Medium',
      due_date: due,
      estimate_cad: plan.estimate_cad ?? 0,
      vendor: plan.vendor ?? null,
      maintenance_plan_id: plan.id,
      owner_id: ownerId,
    }).select('id, title').single()
    if (insErr) {
      console.error(`Failed to generate project for plan ${plan.id}:`, insErr.message)
      continue
    }

    const checklist = Array.isArray(plan.checklist) ? plan.checklist : []
    if (checklist.length) {
      await sb.from('subtasks').insert(
        checklist.map((item, i) => ({ project_id: project.id, text: item.text, position: i })),
      )
    }

    await sb.from('maintenance_plans').update({ last_generated_due: due }).eq('id', plan.id)
    generated.push({ plan: plan.title, project: project.title, due })
  }

  return generated
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.authorization ?? ''
  if (!secret || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const sb = getSupabase()
  const todayIso = new Date().toISOString().slice(0, 10)
  const result = { date: todayIso, generated: [], alerts: null, digest: null, errors: [] }

  try {
    result.generated = await generateMaintenanceProjects(sb, todayIso)
  } catch (e) {
    result.errors.push(`maintenance: ${e.message}`)
  }

  try {
    result.alerts = await runAlerts(sb, todayIso, result.generated)
  } catch (e) {
    result.errors.push(`alerts: ${e.message}`)
  }

  try {
    const isMonday = new Date().getUTCDay() === 1
    if (isMonday) result.digest = await runWeeklyDigest(sb, todayIso)
  } catch (e) {
    result.errors.push(`digest: ${e.message}`)
  }

  return res.status(result.errors.length ? 500 : 200).json(result)
}
