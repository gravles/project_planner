import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from '../stores/toastStore'

// ── Projects ─────────────────────────────────────────────────────────────────

export function useProjects(propertyName = null) {
  return useQuery({
    queryKey: ['projects', propertyName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          properties(id, name, color, icon),
          subtasks(id, done),
          spend_entries(amount_cad),
          project_tags(tag_id, tags(id, name, color))
        `)
        .eq('is_template', false)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false })
      if (error) throw error
      if (propertyName) return data.filter(p => p.properties?.name === propertyName)
      return data
    },
  })
}

export function useProject(id) {
  return useQuery({
    queryKey: ['project', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          share_token,
          properties(*),
          subtasks(*),
          spend_entries(*),
          activity_log(*),
          project_tags(tag_id, tags(*)),
          project_photos(*)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      data.subtasks?.sort((a, b) => a.position - b.position || new Date(a.created_at) - new Date(b.created_at))
      data.spend_entries?.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
      data.activity_log?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      data.project_photos?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      return data
    },
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ project, subtasks = [], tagIds = [] }) => {
      const { data, error } = await supabase.from('projects').insert(project).select().single()
      if (error) throw error
      if (subtasks.length > 0) {
        const { error: stErr } = await supabase
          .from('subtasks')
          .insert(subtasks.map((t, i) => ({ project_id: data.id, text: t.text, position: i })))
        if (stErr) throw stErr
      }
      if (tagIds.length > 0) {
        await supabase.from('project_tags').insert(tagIds.map(tid => ({ project_id: data.id, tag_id: tid })))
      }
      return data
    },
    onSuccess: () => {
      toast.success('Project created')
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (e) => toast.error(e.message ?? 'Failed to create project'),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { error } = await supabase.from('projects').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', id] })
    },
    onError: (e) => toast.error(e.message ?? 'Failed to update project'),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Project deleted')
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (e) => toast.error(e.message ?? 'Failed to delete project'),
  })
}

// ── Project Tags ──────────────────────────────────────────────────────────────

export function useUpdateProjectTags() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, tagIds }) => {
      await supabase.from('project_tags').delete().eq('project_id', projectId)
      if (tagIds.length > 0) {
        const { error } = await supabase
          .from('project_tags')
          .insert(tagIds.map(tid => ({ project_id: projectId, tag_id: tid })))
        if (error) throw error
      }
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

// ── Subtasks ──────────────────────────────────────────────────────────────────

export function useAddSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, text, position = 0 }) => {
      const { error } = await supabase
        .from('subtasks')
        .insert({ project_id: projectId, text, position })
      if (error) throw error
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useToggleSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, done }) => {
      const { error } = await supabase.from('subtasks').update({ done }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...fields }) => {
      const { error } = await supabase.from('subtasks').update(fields).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useDeleteSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from('subtasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

// ── Spend ─────────────────────────────────────────────────────────────────────

export function useAddSpend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, amount_cad, note, entry_date, receipt_url }) => {
      const { error } = await supabase
        .from('spend_entries')
        .insert({ project_id: projectId, amount_cad, note, entry_date, receipt_url: receipt_url || null })
      if (error) throw error
    },
    onSuccess: (_, { projectId }) => {
      toast.success('Spend entry added')
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (e) => toast.error(e.message ?? 'Failed to add spend entry'),
  })
}

export function useUpdateSpend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, amount_cad, note, entry_date, receipt_url }) => {
      const { error } = await supabase
        .from('spend_entries')
        .update({ amount_cad, note: note || null, entry_date, receipt_url: receipt_url || null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (e) => toast.error(e.message ?? 'Failed to update spend entry'),
  })
}

export function useDeleteSpend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from('spend_entries').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { projectId }) => {
      toast.success('Entry deleted')
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useGenerateShareToken() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (projectId) => {
      const token = crypto.randomUUID()
      const { error } = await supabase.from('projects').update({ share_token: token }).eq('id', projectId)
      if (error) throw error
      return token
    },
    onSuccess: (_, projectId) => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
    },
    onError: (e) => toast.error(e.message ?? 'Failed to generate share link'),
  })
}
