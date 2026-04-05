// GET  /oauth/authorize — show approval page
// POST /oauth/authorize — issue auth code and redirect
import { getSupabase, randomToken, json, oauthError, handleOptions, cors, ISSUER } from '../_lib/oauth.js'

function authPage(params) {
  const qs = new URLSearchParams(params).toString()
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize — Project Planner</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0f0f0f; color: #e5e5e5; min-height: 100vh;
           display: flex; align-items: center; justify-content: center; }
    .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 16px;
            padding: 2rem; max-width: 400px; width: 100%; text-align: center; }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
    p  { font-size: 0.875rem; color: #9ca3af; margin-bottom: 1.5rem; line-height: 1.5; }
    button { width: 100%; padding: 0.75rem 1.5rem; border-radius: 8px; border: none;
             background: #f59e0b; color: #0f0f0f; font-size: 0.875rem; font-weight: 600;
             cursor: pointer; transition: background 0.15s; }
    button:hover { background: #fbbf24; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorize Project Planner</h1>
    <p>Claude is requesting access to manage your projects, add spend entries, and update tasks.</p>
    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="_params" value="${qs}">
      <button type="submit">Authorize</button>
    </form>
  </div>
</body>
</html>`
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  const sb = getSupabase()

  // ── GET: show approval page ─────────────────────────────────────────────
  if (req.method === 'GET') {
    const q = new URL(req.url, ISSUER).searchParams
    const client_id      = q.get('client_id')
    const redirect_uri   = q.get('redirect_uri')
    const response_type  = q.get('response_type')
    const code_challenge = q.get('code_challenge')
    const state          = q.get('state')

    if (response_type !== 'code') return oauthError(res, 'unsupported_response_type', 'Only code is supported')
    if (!client_id || !redirect_uri || !code_challenge) return oauthError(res, 'invalid_request', 'Missing required parameters')

    // Verify client exists and redirect_uri is registered
    const { data: client } = await sb.from('oauth_clients').select('redirect_uris').eq('client_id', client_id).single()
    if (!client || !client.redirect_uris.includes(redirect_uri)) {
      return oauthError(res, 'invalid_client', 'Unknown client or redirect_uri', 401)
    }

    cors(res)
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(authPage({ client_id, redirect_uri, code_challenge, state: state ?? '' }))
    return
  }

  // ── POST: issue code and redirect ───────────────────────────────────────
  if (req.method === 'POST') {
    let raw = ''
    await new Promise(r => { req.on('data', c => { raw += c }); req.on('end', r) })
    const body = Object.fromEntries(new URLSearchParams(raw))

    // Params are packed into _params by the hidden form field
    const p = Object.fromEntries(new URLSearchParams(body._params ?? ''))
    const { client_id, redirect_uri, code_challenge, state } = p

    if (!client_id || !redirect_uri || !code_challenge) {
      return oauthError(res, 'invalid_request', 'Missing required parameters')
    }

    const code      = randomToken(32)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error } = await sb.from('oauth_codes').insert({
      code, client_id, redirect_uri, code_challenge, expires_at: expiresAt,
    })
    if (error) return oauthError(res, 'server_error', error.message, 500)

    const redirectUrl = new URL(redirect_uri)
    redirectUrl.searchParams.set('code', code)
    if (state) redirectUrl.searchParams.set('state', state)

    res.writeHead(302, { Location: redirectUrl.toString() })
    res.end()
    return
  }

  oauthError(res, 'invalid_request', 'GET or POST required', 405)
}
