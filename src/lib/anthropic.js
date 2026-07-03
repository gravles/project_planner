// All Claude calls go through /api/claude (Vercel serverless proxy).
// The Anthropic API key lives server-side as ANTHROPIC_API_KEY — never in the browser.
// The proxy requires a valid Supabase session token in the Authorization header.
import { supabase } from './supabase'

const PROXY = '/api/claude'

async function callClaude(body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('You must be signed in to use AI features.')
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

export async function parseProjectFromText(text) {
  const data = await callClaude({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: `You are a home project parser. Extract structured project data from the user's description.
Return ONLY a valid JSON object with these exact fields:
{
  "title": string,
  "property": "King George" | "Coach House" | "Olmstead" | "Other",
  "room": "Exterior" | "Kitchen" | "Living Room" | "Bedroom" | "Bathroom" | "Basement" | "Electrical" | "Permits & Legal" | "Other",
  "status": "Backlog" | "In Progress" | "Blocked" | "Done",
  "priority": "Low" | "Medium" | "High" | "Urgent",
  "due_date": "YYYY-MM-DD or null",
  "estimate_cad": number,
  "vendor": string,
  "notes": string,
  "subtasks": [{ "text": string }]
}
No markdown. No explanation. JSON only.`,
    messages: [{ role: 'user', content: text }],
  })
  const raw = data.content?.find(b => b.type === 'text')?.text || '{}'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function getProjectSuggestions(project) {
  const data = await callClaude({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: `You are a practical home renovation assistant. Given a project's details, suggest 2-3 specific, actionable next steps. Be concrete and practical. Return ONLY a JSON array of strings. No markdown.`,
    messages: [{ role: 'user', content: JSON.stringify({
      title: project.title,
      status: project.status,
      notes: project.notes,
      subtasks: project.subtasks,
      vendor: project.vendor,
    })}],
  })
  const raw = data.content?.find(b => b.type === 'text')?.text || '[]'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function estimateBudget(description) {
  const data = await callClaude({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    system: `You are a Canadian home renovation cost estimator (Ottawa market, CAD prices). Given a description of work, return a JSON object:
{
  "total_cad": number,
  "breakdown": [{ "item": string, "amount_cad": number }],
  "notes": string
}
Be realistic. Include labour if contractor work. JSON only.`,
    messages: [{ role: 'user', content: description }],
  })
  const raw = data.content?.find(b => b.type === 'text')?.text || '{}'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function estimateTime(description) {
  const data = await callClaude({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    system: `You are a home renovation time estimator for a DIY/contractor context in Ottawa, Canada. Given a project description, estimate how long it will take. Return ONLY a valid JSON object:
{
  "total_hours": number,
  "breakdown": [{ "task": string, "hours": number }],
  "diy_vs_contractor": "DIY" | "Contractor" | "Either",
  "notes": string (brief caveats, permit warnings, or tips — max 80 chars)
}
Be realistic — include prep, cleanup, and drying/curing time where relevant. JSON only.`,
    messages: [{ role: 'user', content: description }],
  })
  const raw = data.content?.find(b => b.type === 'text')?.text || '{}'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function parseReceiptImage(base64Data, mimeType = 'image/jpeg') {
  const data = await callClaude({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: `You are a receipt parser. Extract the key details from the receipt image and return ONLY a valid JSON object:
{
  "amount_cad": number (total amount as a number, no dollar sign),
  "date": "YYYY-MM-DD or null if not visible",
  "note": "Merchant name and brief description of what was purchased, max 60 chars"
}
If the total is ambiguous, use the largest amount. JSON only, no markdown.`,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: base64Data },
        },
        { type: 'text', text: 'Parse this receipt.' },
      ],
    }],
  })
  const raw = data.content?.find(b => b.type === 'text')?.text || '{}'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function generateMaterialList(project) {
  const data = await callClaude({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: `You are a home renovation materials expert for the Ottawa, Canada market.
Given a project's details, generate a comprehensive shopping list of materials still needed.
Include specific quantities where relevant (e.g. "2 boxes", "1 gallon", "6 ft").
Focus on remaining work — don't list things the subtasks show are already done.
Return ONLY a JSON array of objects: [{ "text": string, "quantity": string | null }]
Max 12 items. Be specific (brand/type where it matters). JSON only.`,
    messages: [{ role: 'user', content: JSON.stringify({
      title: project.title,
      room: project.room,
      status: project.status,
      notes: project.notes,
      subtasks: project.subtasks?.map(s => ({ text: s.text, done: s.done })),
      vendor: project.vendor,
    }) }],
  })
  const raw = data.content?.find(b => b.type === 'text')?.text || '[]'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function compareBeforeAfter(project, beforePhoto, afterPhoto) {
  const data = await callClaude({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 700,
    system: `You are an expert home renovation advisor. You will be shown a BEFORE photo and an AFTER photo of a renovation project along with its details. Compare the two images carefully.
Return ONLY a valid JSON object:
{
  "summary": "2-3 sentence overall progress assessment written for the homeowner",
  "completed": ["specific visible change 1", ...],
  "outstanding": ["specific thing still visibly unfinished or missing", ...]
}
Be specific about what you actually observe in the photos — don't guess at things not visible. JSON only.`,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'BEFORE:' },
        { type: 'image', source: { type: 'url', url: beforePhoto.url } },
        { type: 'text', text: 'AFTER:' },
        { type: 'image', source: { type: 'url', url: afterPhoto.url } },
        { type: 'text', text: `Project: ${JSON.stringify({ title: project.title, room: project.room, status: project.status, notes: project.notes })}` },
      ],
    }],
  })
  const raw = data.content?.find(b => b.type === 'text')?.text || '{}'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function getRoomRecommendations(project, photos) {
  // Build content blocks: up to 5 photos across all types, then the full project context
  const photoBlocks = photos.slice(0, 5).map(p => ({
    type: 'image',
    source: { type: 'url', url: p.url },
  }))

  const context = {
    title: project.title,
    room: project.room,
    property: project.property,
    status: project.status,
    priority: project.priority,
    notes: project.notes,
    vendor: project.vendor,
    estimate_cad: project.estimate_cad,
    subtasks: project.subtasks?.map(s => ({ text: s.text, done: s.done })),
    photo_types: photos.map(p => p.photo_type),
  }

  const data = await callClaude({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: `You are an expert home renovation advisor helping a homeowner in Ottawa, Canada.
You will be shown photos of a room renovation project along with its full details.
Analyze what you see and the project context together to give 4-5 specific, practical recommendations.
Focus on: what's visibly missing or unfinished, smart next purchases, common oversights for this room type, and anything that could prevent future problems.
Be concrete — name actual products, materials, or steps. Keep each point to 1-2 sentences.
Return ONLY a JSON array of strings. No markdown.`,
    messages: [{
      role: 'user',
      content: [
        ...photoBlocks,
        { type: 'text', text: `Project details: ${JSON.stringify(context)}` },
      ],
    }],
  })
  const raw = data.content?.find(b => b.type === 'text')?.text || '[]'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function parseDocument(base64Data, mimeType) {
  const block = mimeType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } }
    : { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } }
  const data = await callClaude({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    system: `You are a home document classifier. Extract key details from the document (permit, warranty card, insurance policy, appliance manual, quote, or invoice) and return ONLY a valid JSON object:
{
  "title": "short descriptive title, max 60 chars (e.g. 'LG Dishwasher Warranty', 'STR Permit 2026')",
  "doc_type": "permit" | "warranty" | "insurance" | "manual" | "quote" | "invoice" | "other",
  "expires_on": "YYYY-MM-DD or null (expiry, renewal, or warranty-end date if visible)",
  "vendor": "issuing company/vendor or null",
  "notes": "one useful detail worth remembering, max 100 chars, or null"
}
JSON only, no markdown.`,
    messages: [{
      role: 'user',
      content: [block, { type: 'text', text: 'Classify this document.' }],
    }],
  })
  const raw = data.content?.find(b => b.type === 'text')?.text || '{}'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function suggestMaintenancePlans(property, existingTitles = []) {
  const data = await callClaude({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    system: `You are a home maintenance expert for the Ottawa, Canada climate (cold snowy winters, hot humid summers, freeze-thaw springs).
Given a property, suggest a preventive maintenance schedule.
Return ONLY a JSON array (max 8 items) of:
{
  "title": string (short task name, e.g. "Replace furnace filter"),
  "cadence": "monthly" | "quarterly" | "biannual" | "annual",
  "anchor_month": number 1-12 (the month it should happen; for quarterly the phase month; pick seasonally sensible months),
  "checklist": [{ "text": string }] (2-5 concrete steps),
  "estimate_cad": number (0 if DIY-free),
  "room": "Exterior" | "Kitchen" | "Living Room" | "Bedroom" | "Bathroom" | "Basement" | "Electrical" | "Other"
}
Skip anything already covered by these existing plans: ${JSON.stringify(existingTitles)}.
Prioritize items that prevent expensive damage (gutters, furnace, sump pump, caulking, smoke detectors). JSON only, no markdown.`,
    messages: [{ role: 'user', content: JSON.stringify(property) }],
  })
  const raw = data.content?.find(b => b.type === 'text')?.text || '[]'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function generateWeeklySummary(projects) {
  const data = await callClaude({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: `You are a home project assistant writing a weekly summary for the homeowner. Be direct and practical. Structure: what's in progress, what's overdue and needs attention, what was recently completed, current budget status. Use plain English, not bullet points. Keep it under 200 words.`,
    messages: [{ role: 'user', content: JSON.stringify(projects) }],
  })
  return data.content?.find(b => b.type === 'text')?.text || ''
}
