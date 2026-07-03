import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getSignedUrls } from '../lib/supabase'
import { toast } from '../stores/toastStore'

export function useProjectPhotos(projectId) {
  return useQuery({
    queryKey: ['photos', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_photos')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at')
      if (error) throw error
      const urls = await getSignedUrls(data.map(p => p.storage_path))
      return data.map(photo => ({ ...photo, url: urls.get(photo.storage_path) ?? null }))
    },
  })
}

export function useUploadPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, file, photoType = 'progress', caption = null }) => {
      const ext = file.name.split('.').pop().toLowerCase()
      const path = `photos/${projectId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('project-files')
        .upload(path, file, { contentType: file.type })
      if (upErr) throw upErr
      const { error: dbErr } = await supabase
        .from('project_photos')
        .insert({ project_id: projectId, storage_path: path, caption, photo_type: photoType })
      if (dbErr) throw dbErr
    },
    onSuccess: (_, { projectId }) => {
      toast.success('Photo uploaded')
      qc.invalidateQueries({ queryKey: ['photos', projectId] })
    },
    onError: (e) => toast.error(e.message ?? 'Upload failed'),
  })
}

export function useDeletePhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, storagePath }) => {
      await supabase.storage.from('project-files').remove([storagePath])
      const { error } = await supabase.from('project_photos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { projectId }) => {
      toast.success('Photo deleted')
      qc.invalidateQueries({ queryKey: ['photos', projectId] })
    },
  })
}
