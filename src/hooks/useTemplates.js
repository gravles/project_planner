import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from '../stores/toastStore'

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, subtasks(*)')
        .eq('is_template', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useSaveAsTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, templateName }) => {
      // Fetch source project + subtasks
      const { data: source, error: fetchErr } = await supabase
        .from('projects')
        .select('*, subtasks(*)')
        .eq('id', projectId)
        .single()
      if (fetchErr) throw fetchErr

      // Create template project row
      const { data: template, error: insertErr } = await supabase
        .from('projects')
        .insert({
          title: templateName || source.title,
          template_name: templateName || source.title,
          property_id: source.property_id,
          room: source.room,
          status: 'Backlog',
          priority: source.priority,
          estimate_cad: source.estimate_cad ?? 0,
          vendor: source.vendor,
          notes: source.notes,
          is_template: true,
        })
        .select()
        .single()
      if (insertErr) throw insertErr

      // Copy subtasks (reset done state)
      if (source.subtasks?.length > 0) {
        await supabase.from('subtasks').insert(
          source.subtasks.map((s, i) => ({
            project_id: template.id,
            text: s.text,
            done: false,
            position: s.position ?? i,
          }))
        )
      }
      return template
    },
    onSuccess: () => {
      toast.success('Saved as template')
      qc.invalidateQueries({ queryKey: ['templates'] })
    },
    onError: (e) => toast.error(e.message ?? 'Failed to save template'),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Template deleted')
      qc.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}
