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
      notes: z.string().optional(),
      room: z.string().optional(),
    },
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
    },
    async ({ project_id, title_search, amount_cad, note, entry_date }) => {
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
      })
      if (error) throw new Error(error.message)
      return text(`Logged $${amount_cad} CAD${note ? ` — ${note}` : ''}`)
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
  try {
    await verifyAccessToken(token)
  } catch {
    cors(res)
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'invalid_token', error_description: 'Token invalid or expired' }))
    return
  }

  const body = req.method === 'POST' ? await parseBody(req) : undefined

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — required for serverless
  })
  const server = buildServer()
  await server.connect(transport)
  await transport.handleRequest(req, res, body)
}
