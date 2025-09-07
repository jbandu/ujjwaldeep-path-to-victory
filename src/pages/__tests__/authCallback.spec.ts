import { describe, it, expect } from 'vitest'

function hasCode(url: string) {
  const u = new URL(url)
  return u.searchParams.has('code')
}
function hasTokens(url: string) {
  return url.includes('#access_token=')
}

describe('callback URL parsing', () => {
  it('detects OAuth code in query', () => {
    expect(hasCode('https://app/auth/callback?code=abc')).toBe(true)
  })
  it('detects magic link tokens in hash', () => {
    expect(hasTokens('https://app/auth/callback#access_token=xyz')).toBe(true)
  })
})
