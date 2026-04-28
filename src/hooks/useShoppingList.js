import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from '../stores/toastStore'

const QK = ['shopping_list']

export function useShoppingList() {
  return useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shopping_list_items')
        .select('*, projects(id, title, room)')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useAddShoppingItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ items, projectId }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const rows = items.map(item => ({
        user_id: user.id,
        project_id: projectId ?? null,
        text: item.text,
        quantity: item.quantity ?? null,
      }))
      const { error } = await supabase.from('shopping_list_items').insert(rows)
      if (error) throw error
    },
    onSuccess: (_, { items }) => {
      toast.success(`${items.length} item${items.length !== 1 ? 's' : ''} added to shopping list`)
      qc.invalidateQueries({ queryKey: QK })
    },
    onError: e => toast.error(e.message ?? 'Failed to add items'),
  })
}

export function useToggleShoppingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, checked }) => {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ checked })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdateShoppingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, text, quantity }) => {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ text, quantity: quantity || null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useDeleteShoppingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('shopping_list_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useClearCheckedItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('user_id', user.id)
        .eq('checked', true)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Cleared checked items')
      qc.invalidateQueries({ queryKey: QK })
    },
    onError: e => toast.error(e.message ?? 'Failed to clear items'),
  })
}
