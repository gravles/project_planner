import { useState } from 'react'
import {
  useProjectMembers,
  useProjectInvitations,
  useInviteCollaborator,
  useRemoveCollaborator,
  useCancelInvitation,
} from '../../hooks/useCollaborators'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'

function Avatar({ email, displayName }) {
  const initials = (displayName || email || '?').slice(0, 2).toUpperCase()
  return (
    <div className="w-7 h-7 rounded-full bg-accent/20 text-accent text-[11px] font-bold flex items-center justify-center shrink-0">
      {initials}
    </div>
  )
}

export default function SharePanel({ projectId }) {
  const { session } = useAuth()
  const currentUserId = session?.user?.id

  const { data: members = [] } = useProjectMembers(projectId)
  const { data: pending = [] } = useProjectInvitations(projectId)

  const inviteCollaborator = useInviteCollaborator()
  const removeCollaborator = useRemoveCollaborator()
  const cancelInvitation = useCancelInvitation()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [confirmRemoveId, setConfirmRemoveId] = useState(null)

  const owner = members.find(m => m.is_owner)
  const isOwner = owner?.user_id === currentUserId || !owner  // null owner_id = legacy project, treat current user as owner

  async function handleInvite(e) {
    e.preventDefault()
    if (!email.trim()) return
    await inviteCollaborator.mutateAsync({ projectId, email: email.trim(), role })
    setEmail('')
  }

  return (
    <div className="space-y-4">
      {/* Current members */}
      <div className="space-y-1">
        {members.map(member => (
          <div
            key={member.user_id}
            className="flex items-center gap-2.5 py-1.5 group"
          >
            <Avatar email={member.email} displayName={member.display_name} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">
                {member.display_name || member.email}
                {member.user_id === currentUserId && (
                  <span className="ml-1.5 text-[10px] text-text-muted">(you)</span>
                )}
              </p>
              {member.display_name && (
                <p className="text-[11px] text-text-muted truncate">{member.email}</p>
              )}
            </div>
            <span className={cn(
              'text-[11px] px-1.5 py-0.5 rounded font-medium',
              member.is_owner
                ? 'text-accent bg-accent/10'
                : 'text-text-muted bg-bg-elevated',
            )}>
              {member.is_owner ? 'owner' : member.role}
            </span>
            {isOwner && !member.is_owner && (
              <>
                {confirmRemoveId === member.user_id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => { removeCollaborator.mutate({ projectId, userId: member.user_id }); setConfirmRemoveId(null) }}
                      className="text-[11px] px-2 py-0.5 rounded bg-danger text-white"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => setConfirmRemoveId(null)}
                      className="text-[11px] text-text-muted hover:text-text-secondary"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRemoveId(member.user_id)}
                    className="opacity-0 group-hover:opacity-100 text-[11px] text-text-muted hover:text-danger transition-all"
                  >
                    Remove
                  </button>
                )}
              </>
            )}
          </div>
        ))}

        {/* Pending invitations */}
        {pending.map(inv => (
          <div key={inv.id} className="flex items-center gap-2.5 py-1.5 group">
            <div className="w-7 h-7 rounded-full border border-dashed border-border flex items-center justify-center shrink-0">
              <span className="text-[10px] text-text-muted">?</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-secondary truncate">{inv.email}</p>
            </div>
            <span className="text-[11px] text-text-muted italic">pending</span>
            {isOwner && (
              <button
                onClick={() => cancelInvitation.mutate({ invitationId: inv.id, projectId })}
                className="opacity-0 group-hover:opacity-100 text-[11px] text-text-muted hover:text-danger transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        ))}

        {members.length === 0 && pending.length === 0 && (
          <p className="text-xs text-text-muted py-1">Only you have access.</p>
        )}
      </div>

      {/* Invite form */}
      {isOwner && (
        <form onSubmit={handleInvite} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="bg-bg-elevated border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="editor">Can edit</option>
              <option value="viewer">View only</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={!email.trim() || inviteCollaborator.isPending}
            className="w-full py-1.5 rounded-lg text-sm font-semibold bg-accent hover:bg-amber-400 text-bg-base transition-colors disabled:opacity-50"
          >
            {inviteCollaborator.isPending ? 'Inviting…' : 'Invite'}
          </button>
          <p className="text-[11px] text-text-muted leading-relaxed">
            If they don't have an account yet, they'll get access automatically when they sign in.
          </p>
        </form>
      )}
    </div>
  )
}
