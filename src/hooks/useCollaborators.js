import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from '../stores/toastStore'

// Members (owner + collaborators) via the SECURITY DEFINER function
export function useProjectMembers(projectId) {
  return useQuery({
    queryKey: ['project-members', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_project_members', { p_project_id: projectId })
      if (error) throw error
      return data ?? []
    },
  })
}

// Pending invitations for a project
export function useProjectInvitations(projectId) {
  return useQuery({
    queryKey: ['project-invitations', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_invitations')
        .select('*')
        .eq('project_id', projectId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

// Invite by email — resolves to direct collaborator if user exists, else pending invitation
export function useInviteCollaborator() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, email, role = 'editor' }) => {
      const normalised = email.trim().toLowerCase()

      // Check if this email has a profile (user already exists)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', normalised)
        .maybeSingle()

      if (profile) {
        // Add directly as collaborator
        const { error } = await supabase.from('project_collaborators').insert({
          project_id: projectId,
          user_id: profile.id,
          role,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
        })
        if (error) {
          if (error.code === '23505') throw new Error('That person already has access.')
          throw error
        }
        return { type: 'direct' }
      } else {
        // Store pending invitation
        const { error } = await supabase.from('project_invitations').insert({
          project_id: projectId,
          email: normalised,
          role,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
        })
        if (error) {
          if (error.code === '23505') throw new Error('An invitation was already sent to that email.')
          throw error
        }
        return { type: 'pending' }
      }
    },
    onSuccess: (result, { projectId }) => {
      toast.success(
        result.type === 'direct'
          ? 'Collaborator added'
          : 'Invitation sent — they will get access after signing in'
      )
      qc.invalidateQueries({ queryKey: ['project-members', projectId] })
      qc.invalidateQueries({ queryKey: ['project-invitations', projectId] })
    },
    onError: (e) => toast.error(e.message ?? 'Failed to invite'),
  })
}

// Remove a collaborator
export function useRemoveCollaborator() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, userId }) => {
      const { error } = await supabase
        .from('project_collaborators')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: (_, { projectId }) => {
      toast.success('Collaborator removed')
      qc.invalidateQueries({ queryKey: ['project-members', projectId] })
    },
    onError: (e) => toast.error(e.message ?? 'Failed to remove'),
  })
}

// Cancel a pending invitation
export function useCancelInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ invitationId, projectId }) => {
      const { error } = await supabase
        .from('project_invitations')
        .delete()
        .eq('id', invitationId)
      if (error) throw error
    },
    onSuccess: (_, { projectId }) => {
      toast.success('Invitation cancelled')
      qc.invalidateQueries({ queryKey: ['project-invitations', projectId] })
    },
    onError: (e) => toast.error(e.message ?? 'Failed to cancel'),
  })
}

// Called on login — converts any pending invitations for this user's email into real collaborator entries
export async function acceptPendingInvitations(userEmail, userId) {
  if (!userEmail || !userId) return

  const { data: invitations } = await supabase
    .from('project_invitations')
    .select('id, project_id, role, invited_by')
    .eq('email', userEmail.toLowerCase())
    .is('accepted_at', null)

  if (!invitations?.length) return

  for (const inv of invitations) {
    // Insert collaborator entry (ignore if already exists)
    await supabase.from('project_collaborators').upsert({
      project_id: inv.project_id,
      user_id: userId,
      role: inv.role,
      invited_by: inv.invited_by,
    }, { onConflict: 'project_id,user_id' })

    // Mark invitation as accepted
    await supabase
      .from('project_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', inv.id)
  }
}
