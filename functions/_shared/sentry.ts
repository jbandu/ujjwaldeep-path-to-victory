// Sentry for Deno edge functions
import * as Sentry from 'https://esm.sh/@sentry/deno@8'

export function initSentry(functionName: string) {
  const dsn = Deno.env.get('SENTRY_DSN') || ''
  if (dsn) {
    Sentry.init({
      dsn,
      environment: Deno.env.get('ENV') ?? 'production',
      release: Deno.env.get('RELEASE') ?? '',
      tracesSampleRate: 0.1,
    })
    Sentry.setTag('function', functionName)
  }
  return Sentry
}
