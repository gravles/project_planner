import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from '../stores/toastStore'

export function useMaintenancePlans() {
  return useQuery({
    queryKey: ['maintenance_plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_plans')
        .select('*, properties(id, name, color, icon)')
        .order('created_at')
      if (error) throw error
      return data
    },
  })
}

// Projects generated from plans — used to show per-month status chips
export function useMaintenanceProjects() {
  return useQuery({
    queryKey: ['maintenance_projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, status, due_date, maintenance_plan_id')
        .not('maintenance_plan_id', 'is', null)
        .is('deleted_at', null)
      if (error) throw error
      return data
    },
  })
}

function invalidate(qc) {
  qc.invalidateQueries({ queryKey: ['maintenance_plans'] })
  qc.invalidateQueries({ queryKey: ['maintenance_projects'] })
}

export function useCreatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (plan) => {
      const { error } = await supabase.from('maintenance_plans').insert(plan)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Plan created'); invalidate(qc) },
    onError: (e) => toast.error(e.message ?? 'Failed to create plan'),
  })
}

export function useCreatePlans() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (plans) => {
      const { error } = await supabase.from('maintenance_plans').insert(plans)
      if (error) throw error
    },
    onSuccess: (_, plans) => { toast.success(`${plans.length} plan${plans.length === 1 ? '' : 's'} added`); invalidate(qc) },
    onError: (e) => toast.error(e.message ?? 'Failed to add plans'),
  })
}

export function useUpdatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { error } = await supabase.from('maintenance_plans').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(qc),
    onError: (e) => toast.error(e.message ?? 'Failed to update plan'),
  })
}

export function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('maintenance_plans').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Plan deleted'); invalidate(qc) },
    onError: (e) => toast.error(e.message ?? 'Failed to delete plan'),
  })
}
