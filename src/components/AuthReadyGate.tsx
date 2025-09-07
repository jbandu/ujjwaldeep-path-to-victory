import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AuthReadyGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let unsub: (() => void) | undefined

    // Ensure we have the initial session before rendering the app
    supabase.auth.getSession().finally(() => setReady(true))
    // Keep session hot; not strictly required for gating but safe
    const { data: sub } = supabase.auth.onAuthStateChange(() => {})
    unsub = () => sub.subscription.unsubscribe()

    return () => {
      unsub?.()
    }
  }, [])

  if (!ready) return null
  return <>{children}</>
}
