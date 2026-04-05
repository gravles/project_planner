// POST /oauth/register — Dynamic Client Registration (RFC 7591)
import { getSupabase, sha256hex, randomToken, parseJsonBody, json, oauthError } from '../_lib/oauth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return oauthError(res, 'invalid_request', 'POST required', 405)

  const body = await parseJsonBody(req)
  const redirectUris = body.redirect_uris
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return oauthError(res, 'invalid_client_metadata', 'redirect_uris is required')
  }

  const clientId     = `mcp_${randomToken(16)}`
  const clientSecret = randomToken(32)

  const sb = getSupabase()
  const { error } = await sb.from('oauth_clients').insert({
    client_id:           clientId,
    client_secret_hash:  sha256hex(clientSecret),
    client_name:         body.client_name ?? 'MCP Client',
    redirect_uris:       redirectUris,
  })
  if (error) return oauthError(res, 'server_error', error.message, 500)

  json(res, 201, {
    client_id:             clientId,
    client_secret:         clientSecret,
    client_id_issued_at:   Math.floor(Date.now() / 1000),
    redirect_uris:         redirectUris,
    grant_types:           ['authorization_code', 'refresh_token'],
    response_types:        ['code'],
    token_endpoint_auth_method: 'client_secret_post',
  })
}
