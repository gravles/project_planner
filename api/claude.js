/**
 * Anthropic API proxy — keeps the API key server-side.
 * All Claude calls from the frontend POST to /api/claude with the
 * caller's Supabase access token; requests are verified, constrained
 * to an allowlisted model, and forwarded to api.anthropic.com.
 */

import { createClient } from '@supabase/supabase-js'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const ALLOWED_MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS_CAP = 1500
const MAX_BODY_BYTES = 1.5 * 1024 * 1024 // allows base64 receipt/document images

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' })
  }

  // ── Auth: require a valid Supabase session token ──────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase env vars are not configured on the server.' })
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: userData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !userData?.user) {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }

  // ── Constrain the request ──────────────────────────────────────────────────
  const body = req.body
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' })
  }
  if (body.model !== ALLOWED_MODEL) {
    return res.status(400).json({ error: `Model not allowed. Use ${ALLOWED_MODEL}.` })
  }
  if (typeof body.max_tokens !== 'number' || body.max_tokens > MAX_TOKENS_CAP) {
    return res.status(400).json({ error: `max_tokens must be a number ≤ ${MAX_TOKENS_CAP}` })
  }
  if (JSON.stringify(body).length > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Request body too large' })
  }

  try {
    const upstream = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    const data = await upstream.json()
    return res.status(upstream.status).json(data)
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach Anthropic API', detail: err.message })
  }
}
