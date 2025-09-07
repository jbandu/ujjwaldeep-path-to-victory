import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export function useSession() {
  const [session, setSession] = useState<import('@supabase/supabase-js').Session | null>(null)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (mounted) setSession(sess)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return session
}
