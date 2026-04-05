// POST /oauth/token — exchange auth code or refresh token for access token
import {
  getSupabase, sha256hex, randomToken, verifyPKCE,
  signAccessToken, parseFormBody, json, oauthError,
} from '../_lib/oauth.js'

async function verifyClient(sb, clientId, clientSecret) {
  const { data } = await sb.from('oauth_clients').select('client_secret_hash').eq('client_id', clientId).single()
  return data && data.client_secret_hash === sha256hex(clientSecret)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return oauthError(res, 'invalid_request', 'POST required', 405)

  const sb   = getSupabase()
  const body = await parseFormBody(req)

  const grantType    = body.grant_type
  const clientId     = body.client_id
  const clientSecret = body.client_secret

  if (!clientId || !clientSecret) return oauthError(res, 'invalid_client', 'client_id and client_secret required', 401)
  if (!await verifyClient(sb, clientId, clientSecret)) return oauthError(res, 'invalid_client', 'Invalid client credentials', 401)

  // ── authorization_code ───────────────────────────────────────────────────
  if (grantType === 'authorization_code') {
    const { code, code_verifier, redirect_uri } = body
    if (!code || !code_verifier || !redirect_uri) return oauthError(res, 'invalid_request', 'code, code_verifier and redirect_uri are required')

    const { data: row } = await sb.from('oauth_codes')
      .select('*')
      .eq('code', code)
      .eq('client_id', clientId)
      .single()

    if (!row)                                   return oauthError(res, 'invalid_grant', 'Code not found')
    if (row.used_at)                            return oauthError(res, 'invalid_grant', 'Code already used')
    if (new Date(row.expires_at) < new Date())  return oauthError(res, 'invalid_grant', 'Code expired')
    if (row.redirect_uri !== redirect_uri)      return oauthError(res, 'invalid_grant', 'redirect_uri mismatch')
    if (!verifyPKCE(code_verifier, row.code_challenge)) return oauthError(res, 'invalid_grant', 'PKCE verification failed')

    // Mark code as used
    await sb.from('oauth_codes').update({ used_at: new Date().toISOString() }).eq('code', code)

    const accessToken  = await signAccessToken(clientId)
    const refreshToken = randomToken(40)
    const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await sb.from('oauth_refresh_tokens').insert({
      token_hash: sha256hex(refreshToken),
      client_id:  clientId,
      expires_at: refreshExpiry,
    })

    return json(res, 200, {
      access_token:  accessToken,
      token_type:    'Bearer',
      expires_in:    3600,
      refresh_token: refreshToken,
      scope:         'mcp',
    })
  }

  // ── refresh_token ────────────────────────────────────────────────────────
  if (grantType === 'refresh_token') {
    const { refresh_token } = body
    if (!refresh_token) return oauthError(res, 'invalid_request', 'refresh_token required')

    const { data: row } = await sb.from('oauth_refresh_tokens')
      .select('*')
      .eq('token_hash', sha256hex(refresh_token))
      .eq('client_id', clientId)
      .single()

    if (!row)                                   return oauthError(res, 'invalid_grant', 'Refresh token not found')
    if (row.revoked_at)                         return oauthError(res, 'invalid_grant', 'Refresh token revoked')
    if (new Date(row.expires_at) < new Date())  return oauthError(res, 'invalid_grant', 'Refresh token expired')

    const accessToken = await signAccessToken(clientId)

    return json(res, 200, {
      access_token: accessToken,
      token_type:   'Bearer',
      expires_in:   3600,
      scope:        'mcp',
    })
  }

  oauthError(res, 'unsupported_grant_type', `Unsupported grant type: ${grantType}`)
}
