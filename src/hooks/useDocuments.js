import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getSignedUrls } from '../lib/supabase'
import { toast } from '../stores/toastStore'

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*, properties(id, name, color), projects(id, title)')
        .order('created_at', { ascending: false })
      if (error) throw error
      const urls = await getSignedUrls(data.map(d => d.storage_path))
      return data.map(d => ({ ...d, url: urls.get(d.storage_path) ?? null }))
    },
  })
}

export function useProjectDocuments(projectId) {
  return useQuery({
    queryKey: ['documents', 'project', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const urls = await getSignedUrls(data.map(d => d.storage_path))
      return data.map(d => ({ ...d, url: urls.get(d.storage_path) ?? null }))
    },
  })
}

function invalidate(qc) {
  qc.invalidateQueries({ queryKey: ['documents'] })
}

// Uploads the file to storage, then inserts the metadata row.
export function useCreateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, ...fields }) => {
      if (file.size > 25 * 1024 * 1024) throw new Error('File must be under 25 MB')
      const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `documents/${Date.now()}-${sanitized}`
      const { error: upErr } = await supabase.storage
        .from('project-files')
        .upload(path, file, { contentType: file.type })
      if (upErr) throw upErr
      const { error } = await supabase.from('documents').insert({
        ...fields,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type || null,
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success('Document saved'); invalidate(qc) },
    onError: (e) => toast.error(e.message ?? 'Failed to save document'),
  })
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { error } = await supabase.from('documents').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(qc),
    onError: (e) => toast.error(e.message ?? 'Failed to update document'),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, storagePath }) => {
      await supabase.storage.from('project-files').remove([storagePath])
      const { error } = await supabase.from('documents').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Document deleted'); invalidate(qc) },
    onError: (e) => toast.error(e.message ?? 'Failed to delete document'),
  })
}
