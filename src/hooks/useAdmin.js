import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ── Room Types ────────────────────────────────────────────────────────────────

export function useRoomTypes() {
  return useQuery({
    queryKey: ['roomTypes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_types')
        .select('*')
        .order('sort_order')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateRoomType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name) => {
      const maxOrder = (await supabase.from('room_types').select('sort_order').order('sort_order', { ascending: false }).limit(1)).data?.[0]?.sort_order ?? 0
      const { error } = await supabase.from('room_types').insert({ name: name.trim(), sort_order: maxOrder + 1 })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roomTypes'] }),
  })
}

export function useDeleteRoomType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('room_types').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roomTypes'] }),
  })
}

export function useUpdateRoomType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, sort_order }) => {
      const { error } = await supabase.from('room_types').update({ name, sort_order }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roomTypes'] }),
  })
}

// ── Properties ────────────────────────────────────────────────────────────────

export function useCreateProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, address, icon = '🏠', color = '#818cf8', sort_order }) => {
      const { error } = await supabase.from('properties').insert({ name, address, icon, color, sort_order })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }),
  })
}

export function useUpdateProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...fields }) => {
      const { error } = await supabase.from('properties').update(fields).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useDeleteProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('properties').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tags').select('*').order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, color = '#6b7280' }) => {
      const { error } = await supabase.from('tags').insert({ name: name.trim(), color })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })
}

export function useUpdateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, color }) => {
      const { error } = await supabase.from('tags').update({ name, color }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('tags').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })
}
