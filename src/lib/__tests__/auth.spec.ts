import { describe, it, expect, vi } from 'vitest'
import { authRedirect, signInWithGoogle, resendSignup } from '../auth'
import { supabase } from '@/integrations/supabase/client'

// Unit tests for authentication helpers that interact with Supabase

describe('auth helpers', () => {
  it('signInWithGoogle calls supabase with redirect URL', async () => {
    const spy = vi
      .spyOn(supabase.auth, 'signInWithOAuth')
      .mockResolvedValue({ data: {}, error: null } as any)

    await signInWithGoogle('/next')

    expect(spy).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: authRedirect('/next') },
    })

    spy.mockRestore()
  })

  it('resendSignup forwards email and redirect options', async () => {
    const spy = vi
      .spyOn(supabase.auth, 'resend')
      .mockResolvedValue({ data: {}, error: null } as any)

    await resendSignup('test@example.com', '/next')

    expect(spy).toHaveBeenCalledWith({
      type: 'signup',
      email: 'test@example.com',
      options: { emailRedirectTo: authRedirect('/next') },
    })

    spy.mockRestore()
  })
})

