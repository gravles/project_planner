import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from '../stores/toastStore'

function getPublicUrl(path) {
  return supabase.storage.from('project-files').getPublicUrl(path).data.publicUrl
}

export function useProjectAttachments(projectId) {
  return useQuery({
    queryKey: ['attachments', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_attachments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at')
      if (error) throw error
      return data.map(a => ({ ...a, url: getPublicUrl(a.storage_path) }))
    },
  })
}

export function useUploadAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, file }) => {
      if (file.size > 25 * 1024 * 1024) throw new Error('File must be under 25 MB')
      const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `attachments/${projectId}/${Date.now()}-${sanitized}`
      const { error: upErr } = await supabase.storage
        .from('project-files')
        .upload(path, file, { contentType: file.type })
      if (upErr) throw upErr
      const { error: dbErr } = await supabase.from('project_attachments').insert({
        project_id: projectId,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
      })
      if (dbErr) throw dbErr
    },
    onSuccess: (_, { projectId }) => {
      toast.success('File attached')
      qc.invalidateQueries({ queryKey: ['attachments', projectId] })
    },
    onError: e => toast.error(e.message ?? 'Upload failed'),
  })
}

export function useDeleteAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, storagePath, projectId }) => {
      await supabase.storage.from('project-files').remove([storagePath])
      const { error } = await supabase.from('project_attachments').delete().eq('id', id)
      if (error) throw error
      return { projectId }
    },
    onSuccess: (_, { projectId }) => {
      toast.success('Attachment removed')
      qc.invalidateQueries({ queryKey: ['attachments', projectId] })
    },
    onError: e => toast.error(e.message ?? 'Delete failed'),
  })
}
