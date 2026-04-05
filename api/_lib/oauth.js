import { createHash, randomBytes } from 'crypto'
import { SignJWT, jwtVerify } from 'jose'
import { createClient } from '@supabase/supabase-js'

export const ISSUER = 'https://projects.nathandavie.com'

export function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function jwtSecret() {
  const s = process.env.OAUTH_JWT_SECRET
  if (!s) throw new Error('OAUTH_JWT_SECRET env var is required')
  return new TextEncoder().encode(s)
}

export function sha256hex(value) {
  return createHash('sha256').update(value).digest('hex')
}

function base64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function verifyPKCE(code_verifier, code_challenge) {
  const hash = createHash('sha256').update(code_verifier).digest()
  return base64url(hash) === code_challenge
}

export function randomToken(bytes = 32) {
  return base64url(randomBytes(bytes))
}

export async function signAccessToken(clientId) {
  return new SignJWT({ client_id: clientId, scope: 'mcp' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime('1h')
    .setJti(crypto.randomUUID())
    .sign(jwtSecret())
}

export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, jwtSecret(), { issuer: ISSUER })
  return payload
}

// Parse application/x-www-form-urlencoded body from a raw Node.js request
export async function parseFormBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      try {
        resolve(Object.fromEntries(new URLSearchParams(raw)))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

export async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}) }
      catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

export function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

export function oauthError(res, error, description, status = 400) {
  json(res, status, { error, error_description: description })
}
