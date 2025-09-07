import { supabase } from '@/integrations/supabase/client'

function buildBase(): string {
  // e.g. "https://ujjwaldeep-path-to-victory.lovable.app/" or "https://jbandu.github.io/ujjwaldeep-path-to-victory/"
  const base = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`
  return base.endsWith('/') ? base : base + '/'
}

export function authRedirect(next: string = '/app') {
  const base = buildBase()
  const url = new URL(base + 'auth/callback')
  url.searchParams.set('next', next) // provider-safe param; we’ll read it after callback
  return url.toString()
}

export async function signInWithGoogle(next: string = '/app') {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authRedirect(next) },
  })
}

export async function signInWithOtp(email: string, next: string = '/app') {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: authRedirect(next) },
  })
}
