import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { normalizeNextPath } from '@/utils/url'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams(window.location.search)
        const next = normalizeNextPath(qs.get('next'))

        // Handle both OAuth (PKCE) and magic-link/hash flows
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
        if (error) throw error

        // Clean URL (remove code/hash) before navigation
        const base = (import.meta.env.BASE_URL || '/') as string
        const cleanUrl = base.endsWith('/') ? base : base + '/'
        window.history.replaceState({}, document.title, cleanUrl)

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return navigate('/auth', { replace: true })

        navigate(next, { replace: true })
      } catch (e) {
        console.error('Auth callback error:', e)
        navigate('/auth', { replace: true })
      }
    })()
  }, [navigate])

  return <div style={{ padding: 24 }}>Signing you in…</div>
}
