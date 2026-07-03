import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Storage helpers ──────────────────────────────────────────────────────────
// The project-files bucket is private; all reads go through signed URLs.

const SIGNED_URL_TTL = 60 * 60 // 1 hour

export async function getSignedUrl(path, expiresIn = SIGNED_URL_TTL) {
  const { data, error } = await supabase.storage
    .from('project-files')
    .createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}

// Batch version — returns a Map of path → signed URL. Paths that fail to
// sign (e.g. deleted objects) are simply omitted.
export async function getSignedUrls(paths, expiresIn = SIGNED_URL_TTL) {
  if (!paths?.length) return new Map()
  const { data, error } = await supabase.storage
    .from('project-files')
    .createSignedUrls(paths, expiresIn)
  if (error) throw error
  return new Map(data.filter(d => d.signedUrl).map(d => [d.path, d.signedUrl]))
}
