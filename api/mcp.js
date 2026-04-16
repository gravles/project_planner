/**
 * Project Planner — Remote MCP Server
 * Deployed as a Vercel serverless function at /api/mcp
 *
 * Tools exposed:
 *   list_properties  — list all properties
 *   list_projects    — list projects (filterable)
 *   create_project   — create a new project
 *   update_project   — update an existing project
 *   add_subtask      — add a subtask to a project
 *   log_spend        — record a spend entry
 *
 * Auth: set MCP_SECRET env var in Vercel; pass as Bearer token when
 * registering the MCP server in Claude settings.
 */

import { randomUUID } from 'crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { verifyAccessToken, handleOptions, cors } from './_lib/oauth.js'

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required')
  return createClient(url, key)
}

// Resolve a property name (partial, case-insensitive) to its UUID.
// Returns { id, name } or null. Surfaces a helpful message if not found.
async function resolveProperty(supabase, name) {
  const { data } = await supabase.from('properties').select('id, name').order('sort_order')
  const match = data?.find(p => p.name.toLowerCase().includes(name.toLowerCase()))
  return match ?? null
}

// Find one project by title substring. Returns { id, title } or an error string.
async function resolveProject(supabase, titleSearch) {
  const { data } = await supabase
    .from('projects')
    .select('id, title')
    .ilike('title', `%${titleSearch}%`)
    .eq('is_template', false)
    .limit(3)
  if (!data?.length) return { error: `No project found matching "${titleSearch}"` }
  if (data.length > 1) return {
    error: `Multiple matches: ${data.map(p => `"${p.title}" (${p.id})`).join(', ')} — use the id to be precise.`,
  }
  return { id: data[0].id, title: data[0].title }
}

// Find a subtask within a project by text search or ID.
async function resolveSubtask(supabase, projectId, textSearch, subtaskId) {
  if (subtaskId) {
    const { data } = await supabase.from('subtasks').select('id, text, done').eq('id', subtaskId).single()
    return data ?? { error: `Subtask not found with id ${subtaskId}` }
  }
  if (!textSearch) return { error: 'Provide subtask_id or subtask_text_search.' }
  const { data } = await supabase.from('subtasks').select('id, text, done').eq('project_id', projectId).ilike('text', `%${textSearch}%`)
  if (!data?.length) return { error: `No subtask found matching "${textSearch}"` }
  if (data.length > 1) return {
    error: `Multiple matches: ${data.map(s => `"${s.text}" (${s.id})`).join(', ')} — use subtask_id to be precise.`,
  }
  return data[0]
}

function text(str) {
  return { content: [{ type: 'text', text: str }] }
}

function buildServer() {
  const server = new McpServer({ name: 'project-planner', version: '1.0.0' })
  const sb = getSupabase()

  // ── list_properties ──────────────────────────────────────────────────────
  server.tool(
    'list_properties',
    'List all properties in the planner',
    {},
    async () => {
      const { data, error } = await sb
        .from('properties')
        .select('id, name, address, icon')
        .order('sort_order')
      if (error) throw new Error(error.message)
      return text(JSON.stringify(data, null, 2))
    },
  )

  // ── list_projects ────────────────────────────────────────────────────────
  server.tool(
    'list_projects',
    'List projects, optionally filtered by property name or status',
    {
      property: z.string().optional().describe('Property name (partial match, e.g. "King George")'),
      status: z.enum(['Backlog', 'In Progress', 'Blocked', 'Done']).optional(),
    },
    async ({ property, status }) => {
      let q = sb
        .from('projects')
        .select('id, title, room, status, priority, due_date, estimate_cad, vendor, notes, properties(name), subtasks(id, done)')
        .eq('is_template', false)
        .order('created_at', { ascending: false })
      if (status) q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw new Error(error.message)

      let results = data
      if (property) results = data.filter(p => p.properties?.name?.toLowerCase().includes(property.toLowerCase()))

      const summary = results.map(p => ({
        id: p.id,
        title: p.title,
        property: p.properties?.name ?? '—',
        room: p.room,
        status: p.status,
        priority: p.priority,
        due_date: p.due_date ?? '—',
        estimate_cad: p.estimate_cad,
        vendor: p.vendor ?? '—',
        notes: p.notes ?? '—',
        subtasks: `${p.subtasks?.filter(s => s.done).length ?? 0}/${p.subtasks?.length ?? 0} done`,
      }))
      return text(JSON.stringify(summary, null, 2))
    },
  )

  // ── create_project ───────────────────────────────────────────────────────
  server.tool(
    'create_project',
    'Create a new project in the planner',
    {
      title: z.string().describe('Project title'),
      property: z.string().optional().describe('Property name — partial match, e.g. "King George", "Coach", "Olmstead"'),
      room: z.string().optional().describe('Room or area, e.g. Kitchen, Exterior, Basement, Bathroom (default: Other)'),
      status: z.enum(['Backlog', 'In Progress', 'Blocked', 'Done']).optional().describe('Default: Backlog'),
      priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().describe('Default: Medium'),
      due_date: z.string().optional().describe('Due date as YYYY-MM-DD'),
      estimate_cad: z.number().optional().describe('Estimated cost in CAD'),
      vendor: z.string().optional().describe('Vendor or contractor name'),
      notes: z.string().optional(),
    },
    async ({ title, property, room, status, priority, due_date, estimate_cad, vendor, notes }) => {
      let property_id = null
      if (property) {
        const match = await resolveProperty(sb, property)
        if (!match) {
          const { data: all } = await sb.from('properties').select('name').order('sort_order')
          return text(`Property matching "${property}" not found. Available: ${all?.map(p => p.name).join(', ')}`)
        }
        property_id = match.id
      }

      const { data, error } = await sb.from('projects').insert({
        title,
        property_id,
        room: room ?? 'Other',
        status: status ?? 'Backlog',
        priority: priority ?? 'Medium',
        due_date: due_date ?? null,
        estimate_cad: estimate_cad ?? 0,
        vendor: vendor ?? null,
        notes: notes ?? null,
      }).select('id, title').single()

      if (error) throw new Error(error.message)
      return text(`Created project "${data.title}" (id: ${data.id})`)
    },
  )

  // ── update_project ───────────────────────────────────────────────────────
  server.tool(
    'update_project',
    'Update an existing project by ID or title search',
    {
      id: z.string().optional().describe('Project UUID (preferred if you have it)'),
      title_search: z.string().optional().describe('Search by title substring when you don\'t have the ID'),
      title: z.string().optional().describe('New title'),
      status: z.enum(['Backlog', 'In Progress', 'Blocked', 'Done']).optional(),
      priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
      due_date: z.string().optional().describe('YYYY-MM-DD'),
      estimate_cad: z.number().optional(),
      vendor: z.string().optional(),
      room: z.string().optional(),
    },
    // NOTE: notes is intentionally excluded — use append_note to add notes safely.
    async ({ id, title_search, ...updates }) => {
      let projectId = id
      if (!projectId) {
        if (!title_search) return text('Provide either id or title_search.')
        const resolved = await resolveProject(sb, title_search)
        if (resolved.error) return text(resolved.error)
        projectId = resolved.id
      }

      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined),
      )
      if (Object.keys(cleanUpdates).length === 0) return text('No fields to update provided.')

      const { error } = await sb.from('projects').update(cleanUpdates).eq('id', projectId)
      if (error) throw new Error(error.message)
      return text(`Updated project ${projectId} — changed: ${Object.keys(cleanUpdates).join(', ')}`)
    },
  )

  // ── add_subtask ──────────────────────────────────────────────────────────
  server.tool(
    'add_subtask',
    'Add a subtask to a project',
    {
      project_id: z.string().optional().describe('Project UUID'),
      title_search: z.string().optional().describe('Project title substring search'),
      text: z.string().describe('Subtask description'),
    },
    async ({ project_id, title_search, text: subtaskText }) => {
      let pid = project_id
      if (!pid) {
        if (!title_search) return text('Provide project_id or title_search.')
        const resolved = await resolveProject(sb, title_search)
        if (resolved.error) return text(resolved.error)
        pid = resolved.id
      }
      const { error } = await sb.from('subtasks').insert({ project_id: pid, text: subtaskText })
      if (error) throw new Error(error.message)
      return text(`Added subtask: "${subtaskText}"`)
    },
  )

  // ── log_spend ────────────────────────────────────────────────────────────
  server.tool(
    'log_spend',
    'Record a spend / expense entry against a project',
    {
      project_id: z.string().optional().describe('Project UUID'),
      title_search: z.string().optional().describe('Project title substring search'),
      amount_cad: z.number().describe('Amount spent in CAD'),
      note: z.string().optional().describe('What was purchased or paid for'),
      entry_date: z.string().optional().describe('YYYY-MM-DD (defaults to today)'),
      product_url: z.string().optional().describe('Link to the product page or order (e.g. Amazon, Home Depot)'),
    },
    async ({ project_id, title_search, amount_cad, note, entry_date, product_url }) => {
      let pid = project_id
      if (!pid) {
        if (!title_search) return text('Provide project_id or title_search.')
        const resolved = await resolveProject(sb, title_search)
        if (resolved.error) return text(resolved.error)
        pid = resolved.id
      }
      const { error } = await sb.from('spend_entries').insert({
        project_id: pid,
        amount_cad,
        note: note ?? null,
        entry_date: entry_date ?? new Date().toISOString().split('T')[0],
        receipt_url: product_url ?? null,
      })
      if (error) throw new Error(error.message)
      return text(`Logged $${amount_cad} CAD${note ? ` — ${note}` : ''}`)
    },
  )

  // ── get_project ─────────────────────────────────────────────────────────────
  server.tool(
    'get_project',
    'Get full details of a single project: all subtasks with text/status, all spend entries, notes, budget',
    {
      id: z.string().optional().describe('Project UUID (preferred)'),
      title_search: z.string().optional().describe('Search by title substring'),
    },
    async ({ id, title_search }) => {
      let projectId = id
      if (!projectId) {
        if (!title_search) return text('Provide id or title_search.')
        const resolved = await resolveProject(sb, title_search)
        if (resolved.error) return text(resolved.error)
        projectId = resolved.id
      }
      const { data, error } = await sb
        .from('projects')
        .select(`
          id, title, room, status, priority, due_date, estimate_cad, vendor, notes,
          time_estimate_hours, time_actual_hours,
          properties(name, color),
          subtasks(id, text, done, position),
          spend_entries(id, amount_cad, note, entry_date)
        `)
        .eq('id', projectId)
        .single()
      if (error) throw new Error(error.message)
      data.subtasks?.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      data.spend_entries?.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
      const totalSpent = data.spend_entries?.reduce((s, e) => s + Number(e.amount_cad), 0) ?? 0
      return text(JSON.stringify({
        ...data,
        total_spent_cad: totalSpent,
        budget_remaining_cad: Number(data.estimate_cad ?? 0) - totalSpent,
        subtasks_progress: `${data.subtasks?.filter(s => s.done).length ?? 0}/${data.subtasks?.length ?? 0} done`,
      }, null, 2))
    },
  )

  // ── update_subtask ────────────────────────────────────────────────────────
  server.tool(
    'update_subtask',
    'Mark a subtask done/undone or update its text. Find by subtask_id (from get_project) or by project + text search.',
    {
      subtask_id: z.string().optional().describe('Subtask UUID — use get_project to find it'),
      project_id: z.string().optional().describe('Project UUID — used with subtask_text_search'),
      title_search: z.string().optional().describe('Project title search — used with subtask_text_search'),
      subtask_text_search: z.string().optional().describe('Search subtask by text within the project'),
      done: z.boolean().optional().describe('true = mark done, false = mark not done'),
      text: z.string().optional().describe('New text for the subtask'),
    },
    async ({ subtask_id, project_id, title_search, subtask_text_search, done, text: newText }) => {
      let sid = subtask_id
      if (!sid) {
        let pid = project_id
        if (!pid) {
          if (!title_search) return text('Provide subtask_id, or project context with subtask_text_search.')
          const resolved = await resolveProject(sb, title_search)
          if (resolved.error) return text(resolved.error)
          pid = resolved.id
        }
        const resolved = await resolveSubtask(sb, pid, subtask_text_search, null)
        if (resolved.error) return text(resolved.error)
        sid = resolved.id
      }
      const updates = {}
      if (done !== undefined) updates.done = done
      if (newText) updates.text = newText
      if (Object.keys(updates).length === 0) return text('Provide done or text to update.')
      const { error } = await sb.from('subtasks').update(updates).eq('id', sid)
      if (error) throw new Error(error.message)
      const parts = []
      if (done !== undefined) parts.push(done ? 'marked as done ✓' : 'marked as not done')
      if (newText) parts.push(`text updated to "${newText}"`)
      return text(`Subtask ${parts.join(', ')}`)
    },
  )

  // ── delete_subtask ────────────────────────────────────────────────────────
  server.tool(
    'delete_subtask',
    'Remove a subtask. Find by subtask_id or by project + text search.',
    {
      subtask_id: z.string().optional().describe('Subtask UUID — use get_project to find it'),
      project_id: z.string().optional(),
      title_search: z.string().optional().describe('Project title search'),
      subtask_text_search: z.string().optional().describe('Subtask text to search for'),
    },
    async ({ subtask_id, project_id, title_search, subtask_text_search }) => {
      let sid = subtask_id
      if (!sid) {
        let pid = project_id
        if (!pid) {
          if (!title_search) return text('Provide subtask_id, or project context with subtask_text_search.')
          const resolved = await resolveProject(sb, title_search)
          if (resolved.error) return text(resolved.error)
          pid = resolved.id
        }
        const resolved = await resolveSubtask(sb, pid, subtask_text_search, null)
        if (resolved.error) return text(resolved.error)
        sid = resolved.id
      }
      const { error } = await sb.from('subtasks').delete().eq('id', sid)
      if (error) throw new Error(error.message)
      return text('Subtask deleted.')
    },
  )

  // ── list_spend ────────────────────────────────────────────────────────────
  server.tool(
    'list_spend',
    'List all spend entries for a project with totals',
    {
      project_id: z.string().optional(),
      title_search: z.string().optional().describe('Project title substring'),
    },
    async ({ project_id, title_search }) => {
      let pid = project_id
      if (!pid) {
        if (!title_search) return text('Provide project_id or title_search.')
        const resolved = await resolveProject(sb, title_search)
        if (resolved.error) return text(resolved.error)
        pid = resolved.id
      }
      const { data, error } = await sb
        .from('spend_entries')
        .select('id, amount_cad, note, entry_date')
        .eq('project_id', pid)
        .order('entry_date', { ascending: false })
      if (error) throw new Error(error.message)
      const total = data?.reduce((s, e) => s + Number(e.amount_cad), 0) ?? 0
      return text(JSON.stringify({ entries: data, total_cad: total }, null, 2))
    },
  )

  // ── delete_spend ──────────────────────────────────────────────────────────
  server.tool(
    'delete_spend',
    'Delete a spend entry by its ID (use list_spend to find the ID)',
    {
      spend_id: z.string().describe('Spend entry UUID'),
    },
    async ({ spend_id }) => {
      const { error } = await sb.from('spend_entries').delete().eq('id', spend_id)
      if (error) throw new Error(error.message)
      return text('Spend entry deleted.')
    },
  )

  // ── get_summary ──────────────────────────────────────────────────────────
  server.tool(
    'get_summary',
    'Dashboard overview: project counts by status, overdue items, urgent items, and budget totals by property. Use for morning check-ins and status overviews.',
    {},
    async () => {
      const { data: projects, error } = await sb
        .from('projects')
        .select(`
          id, title, status, priority, due_date, estimate_cad,
          properties(name),
          spend_entries(amount_cad)
        `)
        .eq('is_template', false)
      if (error) throw new Error(error.message)

      const today = new Date().toISOString().split('T')[0]
      const counts = { total: 0, backlog: 0, in_progress: 0, blocked: 0, done: 0 }
      const byProperty = {}
      let totalEstimate = 0, totalSpent = 0

      for (const p of projects) {
        counts.total++
        if (p.status === 'Backlog') counts.backlog++
        else if (p.status === 'In Progress') counts.in_progress++
        else if (p.status === 'Blocked') counts.blocked++
        else if (p.status === 'Done') counts.done++

        const propName = p.properties?.name ?? 'No property'
        if (!byProperty[propName]) byProperty[propName] = { estimate: 0, spent: 0, active: 0 }
        const spent = p.spend_entries?.reduce((s, e) => s + Number(e.amount_cad), 0) ?? 0
        byProperty[propName].estimate += Number(p.estimate_cad ?? 0)
        byProperty[propName].spent += spent
        if (p.status !== 'Done') byProperty[propName].active++
        totalEstimate += Number(p.estimate_cad ?? 0)
        totalSpent += spent
      }

      const overdue = projects
        .filter(p => p.due_date && p.due_date < today && p.status !== 'Done')
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .map(p => ({ id: p.id, title: p.title, due_date: p.due_date, status: p.status, priority: p.priority, property: p.properties?.name }))

      const urgent = projects
        .filter(p => p.priority === 'Urgent' && p.status !== 'Done')
        .map(p => ({ id: p.id, title: p.title, status: p.status, property: p.properties?.name }))

      return text(JSON.stringify({
        counts,
        overdue,
        urgent_items: urgent,
        budget: { total_estimate_cad: totalEstimate, total_spent_cad: totalSpent, remaining_cad: totalEstimate - totalSpent },
        by_property: byProperty,
      }, null, 2))
    },
  )

  // ── list_tags ─────────────────────────────────────────────────────────────
  server.tool(
    'list_tags',
    'List all available tags that can be applied to projects',
    {},
    async () => {
      const { data, error } = await sb.from('tags').select('id, name, color').order('name')
      if (error) throw new Error(error.message)
      return text(JSON.stringify(data, null, 2))
    },
  )

  // ── add_tag ───────────────────────────────────────────────────────────────
  server.tool(
    'add_tag',
    'Add a tag to a project. Use list_tags to see available tags.',
    {
      project_id: z.string().optional(),
      title_search: z.string().optional().describe('Project title substring'),
      tag_name: z.string().describe('Tag name (partial match)'),
    },
    async ({ project_id, title_search, tag_name }) => {
      let pid = project_id
      if (!pid) {
        if (!title_search) return text('Provide project_id or title_search.')
        const resolved = await resolveProject(sb, title_search)
        if (resolved.error) return text(resolved.error)
        pid = resolved.id
      }
      const { data: tags } = await sb.from('tags').select('id, name').ilike('name', `%${tag_name}%`)
      if (!tags?.length) return text(`No tag found matching "${tag_name}". Use list_tags to see available tags.`)
      if (tags.length > 1) return text(`Multiple matches: ${tags.map(t => t.name).join(', ')} — be more specific.`)
      const tag = tags[0]
      const { data: existing } = await sb.from('project_tags').select('tag_id').eq('project_id', pid).eq('tag_id', tag.id).maybeSingle()
      if (existing) return text(`Tag "${tag.name}" is already on this project.`)
      const { error } = await sb.from('project_tags').insert({ project_id: pid, tag_id: tag.id })
      if (error) throw new Error(error.message)
      return text(`Added tag "${tag.name}".`)
    },
  )

  // ── remove_tag ────────────────────────────────────────────────────────────
  server.tool(
    'remove_tag',
    'Remove a tag from a project.',
    {
      project_id: z.string().optional(),
      title_search: z.string().optional().describe('Project title substring'),
      tag_name: z.string().describe('Tag name (partial match)'),
    },
    async ({ project_id, title_search, tag_name }) => {
      let pid = project_id
      if (!pid) {
        if (!title_search) return text('Provide project_id or title_search.')
        const resolved = await resolveProject(sb, title_search)
        if (resolved.error) return text(resolved.error)
        pid = resolved.id
      }
      const { data: tags } = await sb.from('tags').select('id, name').ilike('name', `%${tag_name}%`)
      if (!tags?.length) return text(`No tag found matching "${tag_name}".`)
      if (tags.length > 1) return text(`Multiple matches: ${tags.map(t => t.name).join(', ')} — be more specific.`)
      const tag = tags[0]
      const { error } = await sb.from('project_tags').delete().eq('project_id', pid).eq('tag_id', tag.id)
      if (error) throw new Error(error.message)
      return text(`Removed tag "${tag.name}".`)
    },
  )

  // ── append_note ───────────────────────────────────────────────────────────
  server.tool(
    'append_note',
    'Append text to a project\'s notes without overwriting existing content. Safer than update_project for adding notes.',
    {
      id: z.string().optional().describe('Project UUID (preferred)'),
      title_search: z.string().optional().describe('Search by title substring'),
      text: z.string().describe('Text to append to the notes'),
    },
    async ({ id, title_search, text: newText }) => {
      let projectId = id
      if (!projectId) {
        if (!title_search) return text('Provide id or title_search.')
        const resolved = await resolveProject(sb, title_search)
        if (resolved.error) return text(resolved.error)
        projectId = resolved.id
      }
      const { data, error: fetchErr } = await sb
        .from('projects')
        .select('notes, title')
        .eq('id', projectId)
        .single()
      if (fetchErr) throw new Error(fetchErr.message)
      const date = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
      const separator = data.notes?.trim() ? '\n\n' : ''
      const updated = `${data.notes?.trim() ?? ''}${separator}[${date}] ${newText.trim()}`
      const { error } = await sb.from('projects').update({ notes: updated }).eq('id', projectId)
      if (error) throw new Error(error.message)
      return text(`Note appended to "${data.title}".`)
    },
  )

  // ── generate_share_link ───────────────────────────────────────────────────
  server.tool(
    'generate_share_link',
    'Generate a public read-only share link for a project (no login required to view)',
    {
      id: z.string().optional().describe('Project UUID'),
      title_search: z.string().optional().describe('Project title substring'),
    },
    async ({ id, title_search }) => {
      let projectId = id
      if (!projectId) {
        if (!title_search) return text('Provide id or title_search.')
        const resolved = await resolveProject(sb, title_search)
        if (resolved.error) return text(resolved.error)
        projectId = resolved.id
      }
      const { data: existing } = await sb.from('projects').select('share_token, title').eq('id', projectId).single()
      let token = existing?.share_token
      if (!token) {
        token = randomUUID()
        const { error } = await sb.from('projects').update({ share_token: token }).eq('id', projectId)
        if (error) throw new Error(error.message)
      }
      return text(`Share link for "${existing?.title}": https://projects.nathandavie.com/share/${token}`)
    },
  )

  return server
}

// ── Vercel handler ───────────────────────────────────────────────────────────

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : undefined) }
      catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  // Handle CORS preflight before any auth checks
  if (handleOptions(req, res)) return

  // Verify OAuth JWT access token
  const auth = req.headers['authorization'] ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) {
    cors(res)
    res.writeHead(401, {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer resource_metadata="https://projects.nathandavie.com/.well-known/oauth-protected-resource/api/mcp"',
    })
    res.end(JSON.stringify({ error: 'unauthorized', error_description: 'Bearer token required' }))
    return
  }
  // Accept either a valid OAuth JWT or the static MCP_SECRET (for Claude Desktop)
  const staticSecret = process.env.MCP_SECRET
  const isStaticKey = staticSecret && token === staticSecret
  if (!isStaticKey) {
    try {
      await verifyAccessToken(token)
    } catch {
      cors(res)
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'invalid_token', error_description: 'Token invalid or expired' }))
      return
    }
  }

  const body = req.method === 'POST' ? await parseBody(req) : undefined

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — required for serverless
  })
  const server = buildServer()
  await server.connect(transport)
  await transport.handleRequest(req, res, body)
}
