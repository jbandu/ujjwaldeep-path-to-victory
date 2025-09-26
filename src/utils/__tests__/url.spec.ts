import { describe, it, expect } from 'vitest'
import { normalizeNextPath, NEXT_FALLBACK_PATH } from '@/utils/url'

describe('normalizeNextPath', () => {
  it('returns fallback for empty or missing values', () => {
    expect(normalizeNextPath()).toBe(NEXT_FALLBACK_PATH)
    expect(normalizeNextPath('')).toBe(NEXT_FALLBACK_PATH)
    expect(normalizeNextPath('   ')).toBe(NEXT_FALLBACK_PATH)
  })

  it('allows safe same-origin paths', () => {
    expect(normalizeNextPath('/app')).toBe('/app')
    expect(normalizeNextPath('/#/dashboard')).toBe('/#/dashboard')
    expect(normalizeNextPath('/app?foo=bar')).toBe('/app?foo=bar')
    expect(normalizeNextPath('   /tests/123  ')).toBe('/tests/123')
  })

  it('rejects attempts to use full URLs or protocols', () => {
    expect(normalizeNextPath('https://evil.com')).toBe(NEXT_FALLBACK_PATH)
    expect(normalizeNextPath('http://evil.com')).toBe(NEXT_FALLBACK_PATH)
    expect(normalizeNextPath('/javascript:alert(1)')).toBe(NEXT_FALLBACK_PATH)
  })

  it('rejects paths containing double slashes', () => {
    expect(normalizeNextPath('//evil.com')).toBe(NEXT_FALLBACK_PATH)
    expect(normalizeNextPath('/foo//bar')).toBe(NEXT_FALLBACK_PATH)
    expect(normalizeNextPath('/app?next=//evil.com')).toBe(NEXT_FALLBACK_PATH)
  })
})
