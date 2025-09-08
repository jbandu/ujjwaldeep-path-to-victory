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

// Send magic link and create user if needed
export async function continueWithEmail(email: string, next: string = '/app') {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: authRedirect(next),
    },
  })
}

// Resend confirmation for unconfirmed users
export async function resendSignup(email: string, next: string = '/app') {
  return supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: authRedirect(next) },
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

