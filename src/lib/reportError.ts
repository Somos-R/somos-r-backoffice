// Single place where unexpected errors are reported. Today it only logs; when error monitoring
// arrives (Sentry, tracked as F5.2) this is the one function to connect, so nothing else in the
// app has to change. Never put user data (emails, ids, tokens) in `context`.
export function reportError(error: unknown, context?: Record<string, unknown>) {
  console.error('[app error]', error, context ?? '')
}
