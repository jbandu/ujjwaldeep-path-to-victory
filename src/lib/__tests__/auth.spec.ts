import { describe, it, expect, vi } from 'vitest'
import { authRedirect, signInWithGoogle, signUpWithEmail, signInWithEmail, resetPassword } from '../auth'
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

  it('signUpWithEmail calls supabase with email and password', async () => {
    const spy = vi
      .spyOn(supabase.auth, 'signUp')
      .mockResolvedValue({ data: {}, error: null } as any)

    await signUpWithEmail('test@example.com', 'password123')

    expect(spy).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })

    spy.mockRestore()
  })

  it('signInWithEmail calls supabase with email and password', async () => {
    const spy = vi
      .spyOn(supabase.auth, 'signInWithPassword')
      .mockResolvedValue({ data: {}, error: null } as any)

    await signInWithEmail('test@example.com', 'password123')

    expect(spy).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })

    spy.mockRestore()
  })

  it('resetPassword calls supabase with reset options', async () => {
    const spy = vi
      .spyOn(supabase.auth, 'resetPasswordForEmail')
      .mockResolvedValue({ data: {}, error: null } as any)

    await resetPassword('test@example.com')

    expect(spy).toHaveBeenCalledWith('test@example.com', {
      redirectTo: expect.stringContaining('auth/reset-password'),
    })

    spy.mockRestore()
  })
})

