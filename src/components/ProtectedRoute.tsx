import { ReactNode, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'

type Props = { children: ReactNode }

export default function ProtectedRoute({ children }: Props) {
  const [status, setStatus] = useState<'loading'|'authed'|'unauthed'>('loading')
  const location = useLocation()

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setStatus(session ? 'authed' : 'unauthed')
    })()
  }, [])

  if (status === 'loading') return <div style={{ padding: 24 }}>Loading…</div>
  if (status === 'unauthed') {
    const next = location.pathname + location.search + location.hash
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />
  }
  return <>{children}</>
}
