import { describe, it, expect, vi } from 'vitest'
import { continueWithEmail, authRedirect, cooldownRemaining } from '../../lib/auth'
import { supabase } from '../../integrations/supabase/client'

describe('email auth helpers', () => {
  it('authRedirect builds callback URL with next param', () => {
    const original = window.location
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
    })
    vi.stubEnv('BASE_URL', './')

    const url = authRedirect('/foo')
    expect(url).toBe('https://example.com/auth/callback?next=%2Ffoo')

    vi.unstubAllEnvs()
    Object.defineProperty(window, 'location', { value: original })
  })

  it('continueWithEmail passes creation and redirect options', async () => {
    const spy = vi
      .spyOn(supabase.auth, 'signInWithOtp')
      .mockResolvedValue({ data: {}, error: null } as any)

    await continueWithEmail('test@example.com', '/next')

    expect(spy).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: {
        shouldCreateUser: true,
        emailRedirectTo: authRedirect('/next'),
      },
    })
  })

  it('cooldownRemaining calculates remaining seconds', () => {
    const start = 0
    expect(cooldownRemaining(start, start, 60)).toBe(60)
    expect(cooldownRemaining(start, start + 30000, 60)).toBe(30)
    expect(cooldownRemaining(start, start + 60000, 60)).toBe(0)
  })
})

