import { ReactNode, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { fetchUserProfileSafe } from '@/utils/profileUtils'

type Props = { children: ReactNode }

export default function ProfileProtectedRoute({ children }: Props) {
  const [status, setStatus] = useState<'loading'|'authed'|'needs-onboarding'|'unauthed'>('loading')
  const location = useLocation()

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return setStatus('unauthed')

      console.log('ProfileProtectedRoute: Checking profile for user:', session.user.id)

      // Use safe profile fetcher
      const { profile, error, needsOnboarding } = await fetchUserProfileSafe(session.user.id)

      console.log('ProfileProtectedRoute: Profile query result:', { profile, error, needsOnboarding })

      if (error) {
        console.error('profiles check failed', error)
        // For RLS errors or other issues, allow access but let the app handle it
        return setStatus('authed')
      }

      // If profile exists, user is fully authenticated
      if (profile) {
        console.log('ProfileProtectedRoute: Profile found, setting authed')
        return setStatus('authed')
      }

      // No profile found, needs onboarding
      console.log('ProfileProtectedRoute: No profile found, needs onboarding')
      setStatus('needs-onboarding')
    })()
  }, [])

  if (status === 'loading') return <div style={{ padding: 24 }}>Loading…</div>
  if (status === 'unauthed') {
    const base = import.meta.env.BASE_URL || '/'
    const next = location.pathname + location.search + location.hash
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />
  }
  if (status === 'needs-onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}