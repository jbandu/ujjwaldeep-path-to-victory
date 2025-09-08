import { describe, it, expect, vi } from 'vitest'
import { signInWithEmail, signUpWithEmail, authRedirect, resetPassword } from '../../lib/auth'
import { supabase } from '../../integrations/supabase/client'

describe('email auth helpers', () => {
  it('authRedirect builds callback URL with next param', () => {
    const original = window.location
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
    })

    const url = authRedirect('/foo')
    expect(url).toBe('https://example.com/auth/callback?next=%2Ffoo')

    Object.defineProperty(window, 'location', { value: original })
  })

  it('signInWithEmail passes email and password', async () => {
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

  it('signUpWithEmail passes email and password', async () => {
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

  it('resetPassword sends reset email with redirect URL', async () => {
    const original = window.location
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
    })

    const spy = vi
      .spyOn(supabase.auth, 'resetPasswordForEmail')
      .mockResolvedValue({ data: {}, error: null } as any)

    await resetPassword('test@example.com')

    expect(spy).toHaveBeenCalledWith('test@example.com', {
      redirectTo: 'https://example.com/auth/reset-password',
    })

    spy.mockRestore()
    Object.defineProperty(window, 'location', { value: original })
  })
})