// GET /.well-known/oauth-protected-resource/api/mcp
// Protected Resource Metadata (RFC 9728)
import { ISSUER, json } from './_lib/oauth.js'

export default function handler(req, res) {
  json(res, 200, {
    resource:             `${ISSUER}/api/mcp`,
    authorization_servers: [ISSUER],
    scopes_supported:     ['mcp'],
    bearer_methods_supported: ['header'],
  })
}
