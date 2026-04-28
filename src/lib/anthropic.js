// All Claude calls go through /api/claude (Vercel serverless proxy).
// The Anthropic API key lives server-side as ANTHROPIC_API_KEY — never in the browser.
const PROXY = '/api/claude'

async function callClaude(body) {
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export async function generateWeeklySummary(projects) {
  const data = await callClaude({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: `You are a home project assistant writing a weekly summary for the homeowner. Be direct and practical. Structure: what's in progress, what's overdue and needs attention, what was recently completed, current budget status. Use plain English, not bullet points. Keep it under 200 words.`,
    messages: [{ role: 'user', content: JSON.stringify(projects) }],
  })
  return data.content?.find(b => b.type === 'text')?.text || ''
}
