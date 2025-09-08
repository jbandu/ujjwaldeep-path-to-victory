import { supabase } from '@/integrations/supabase/client'

function buildBase(): string {
  // e.g. "https://ujjwaldeep-path-to-victory.lovable.app/" or "https://jbandu.github.io/ujjwaldeep-path-to-victory/"
  const base = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`
  return base.endsWith('/') ? base : base + '/'
}

export function authRedirect(next: string = '/app') {
  const base = buildBase()
  const url = new URL(base + 'auth/callback')
  url.searchParams.set('next', next) // provider-safe param; we'll read it after callback
  return url.toString()
}

export async function signInWithGoogle(next: string = '/app') {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authRedirect(next) },
  })
}

// Sign up with email and password
export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({
    email,
    password,
  })
}

// Sign in with email and password
export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  })
}

// Send password reset email
export async function resetPassword(email: string) {
  const base = buildBase()
  const redirectTo = `${base}auth/reset-password`
  
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })
}

// Helper to calculate remaining cooldown seconds
export function cooldownRemaining(
  lastSent: number,
  now: number,
  cooldown = 60
): number {
  return Math.max(0, cooldown - Math.floor((now - lastSent) / 1000))
}

