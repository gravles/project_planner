/**
 * Public share endpoint — no auth required.
 * GET /api/share?token=<share_token>
 * Returns project data for read-only public share views.
 */

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Missing token' })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const { data, error } = await supabase
    .from('projects')
    .select(`
      title, status, priority, room, notes, estimate_cad, vendor, due_date,
      properties(name, color, icon),
      subtasks(text, done, position),
      spend_entries(amount_cad, note, entry_date),
      project_photos(storage_path, caption, photo_type, taken_at)
    `)
    .eq('share_token', token)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Project not found' })

  data.subtasks?.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  data.spend_entries?.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))

  // Attach public URLs to photos
  data.project_photos = data.project_photos?.map(photo => ({
    ...photo,
    url: supabase.storage.from('project-files').getPublicUrl(photo.storage_path).data.publicUrl,
  })) ?? []
  data.project_photos.sort((a, b) => new Date(a.taken_at ?? 0) - new Date(b.taken_at ?? 0))

  return res.status(200).json(data)
}
