import { ReactNode, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

type Props = { children: ReactNode }

export default function ProfileProtectedRoute({ children }: Props) {
  const [status, setStatus] = useState<'loading'|'authed'|'needs-onboarding'|'unauthed'>('loading')
  const location = useLocation()

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return setStatus('unauthed')

      console.log('ProfileProtectedRoute: Checking profile for user:', session.user.id)

      // Check if profile row exists
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('user_id', session.user.id)
        .maybeSingle()

      console.log('ProfileProtectedRoute: Profile query result:', { data, error })

      if (error) {
        console.error('profiles check failed', error)
        // default to authed to avoid loops; we'll let app handle missing fields later
        return setStatus('authed')
      }

      const hasProfile = !!data
      console.log('ProfileProtectedRoute: Setting status to:', hasProfile ? 'authed' : 'needs-onboarding')
      setStatus(hasProfile ? 'authed' : 'needs-onboarding')
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