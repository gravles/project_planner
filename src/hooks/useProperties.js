import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useProperties() {
  return useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}
