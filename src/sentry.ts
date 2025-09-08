// Initialize Sentry in the browser
import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN

if (DSN) {
  Sentry.init({
    dsn: DSN,
    integrations: [new BrowserTracing()],
    tracesSampleRate: 0.1, // 10% perf sampling
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_COMMIT_SHA, // optional (set in CI)
  })
}

export { Sentry }
