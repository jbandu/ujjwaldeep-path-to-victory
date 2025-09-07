import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams(window.location.search)
        const next = qs.get('next') || '/app'

        const hasCode = qs.has('code')
        const hash = window.location.hash

        if (hasCode) {
          // OAuth (PKCE) → exchange code for session
          const { error } = await supabase.auth.exchangeCodeForSession({ storeSession: true })
          if (error) throw error
        } else if (hash.includes('access_token')) {
          // Magic link (hash tokens) → create session
          const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true })
          if (error) throw error
        }

        // Clean URL (removes code/hash) before navigation
        const base = import.meta.env.BASE_URL || '/'
        window.history.replaceState({}, document.title, base)

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return navigate('/auth', { replace: true })

        navigate(next, { replace: true })
      } catch (e) {
        console.error('Auth callback error:', e)
        navigate('/', { replace: true })
      }
    })()
  }, [navigate])

  return <div style={{ padding: 24 }}>Signing you in…</div>
}
