import { useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { acceptPendingInvitations } from '../hooks/useCollaborators'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  const acceptedRef = useRef(false)

  useEffect(() => {
    if (session?.user && !acceptedRef.current) {
      acceptedRef.current = true
      acceptPendingInvitations(session.user.email, session.user.id)
    }
  }, [session])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  return children
}
