// GET /.well-known/oauth-authorization-server
// Authorization Server Metadata (RFC 8414)
import { ISSUER, json } from './_lib/oauth.js'

export default function handler(req, res) {
  json(res, 200, {
    issuer: ISSUER,
    authorization_endpoint:        `${ISSUER}/oauth/authorize`,
    token_endpoint:                `${ISSUER}/oauth/token`,
    registration_endpoint:         `${ISSUER}/oauth/register`,
    scopes_supported:              ['mcp'],
    response_types_supported:      ['code'],
    grant_types_supported:         ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    code_challenge_methods_supported: ['S256'],
  })
}
