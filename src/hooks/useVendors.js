import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from '../stores/toastStore'

export function useVendors() {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendors').select('*').order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (fields) => {
      const { error } = await supabase.from('vendors').insert(fields)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Vendor added')
      qc.invalidateQueries({ queryKey: ['vendors'] })
    },
    onError: (e) => toast.error(e.message ?? 'Failed to add vendor'),
  })
}

export function useUpdateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...fields }) => {
      const { error } = await supabase.from('vendors').update(fields).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Vendor updated')
      qc.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

export function useDeleteVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('vendors').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Vendor removed')
      qc.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}
