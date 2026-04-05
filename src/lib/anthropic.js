// Anthropic API key must be set in .env as VITE_ANTHROPIC_API_KEY
// Nathan will provide this key before AI features are used.
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

function getHeaders() {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!key) throw new Error('VITE_ANTHROPIC_API_KEY is not set. Add it to your .env file.')
  return {
    'Content-Type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  }
}

export async function parseProjectFromText(text) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
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
    }),
  })
  const data = await res.json()
  const raw = data.content?.find(b => b.type === 'text')?.text || '{}'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function getProjectSuggestions(project) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
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
    }),
  })
  const data = await res.json()
  const raw = data.content?.find(b => b.type === 'text')?.text || '[]'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function estimateBudget(description) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
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
    }),
  })
  const data = await res.json()
  const raw = data.content?.find(b => b.type === 'text')?.text || '{}'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function parseReceiptImage(base64Data, mimeType = 'image/jpeg') {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
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
    }),
  })
  const data = await res.json()
  const raw = data.content?.find(b => b.type === 'text')?.text || '{}'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function generateWeeklySummary(projects) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: `You are a home project assistant writing a weekly summary for the homeowner. Be direct and practical. Structure: what's in progress, what's overdue and needs attention, what was recently completed, current budget status. Use plain English, not bullet points. Keep it under 200 words.`,
      messages: [{ role: 'user', content: JSON.stringify(projects) }],
    }),
  })
  const data = await res.json()
  return data.content?.find(b => b.type === 'text')?.text || ''
}
