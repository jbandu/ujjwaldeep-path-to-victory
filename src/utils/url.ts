export const NEXT_FALLBACK_PATH = '/app'

const PROTOCOL_PATTERN = /[a-zA-Z][a-zA-Z0-9+.-]*:/

export const normalizeNextPath = (value?: string | null): string => {
  if (!value) {
    return NEXT_FALLBACK_PATH
  }

  const trimmed = value.trim()
  if (!trimmed.startsWith('/')) {
    return NEXT_FALLBACK_PATH
  }

  if (trimmed.startsWith('//')) {
    return NEXT_FALLBACK_PATH
  }

  if (trimmed.includes('//')) {
    return NEXT_FALLBACK_PATH
  }

  const withoutLeadingSlash = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed
  if (PROTOCOL_PATTERN.test(withoutLeadingSlash)) {
    return NEXT_FALLBACK_PATH
  }

  if (trimmed.includes('://')) {
    return NEXT_FALLBACK_PATH
  }

  return trimmed || NEXT_FALLBACK_PATH
}
