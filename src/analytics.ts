import posthog from 'posthog-js'

const KEY = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.posthog.com'

export function initAnalytics() {
  if (!KEY) return
  posthog.init(KEY, { api_host: HOST, autocapture: true })
}

export { posthog }
