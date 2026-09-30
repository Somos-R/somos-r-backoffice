// Build-time checks for the settings that get baked into the bundle. `VITE_*` values are compiled
// into the JavaScript, so a wrong one ships to every user and can't be fixed without a new build.

const LOCAL_HOSTS = /^(localhost|.*\.localhost|127(\.\d{1,3}){3}|0\.0\.0\.0|\[?::1\]?)$/i

/** Why `value` can't be the API URL of a production build, or null when it can. */
export function validateApiUrl(value: string | undefined, { allowLocal = false } = {}): string | null {
  if (value === undefined || value.trim() === '') {
    return (
      'VITE_API_URL is not set. A production build needs the backend URL, e.g. https://api.example.com: ' +
      'without it the app would call its own origin and fail at runtime with no build error. ' +
      'Set it in the environment (CI: repository variable VITE_API_URL; Docker: --build-arg VITE_API_URL=...).'
    )
  }
  if (value !== value.trim()) return `VITE_API_URL has leading or trailing whitespace: "${value}".`

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return `VITE_API_URL is not a valid absolute URL: "${value}".`
  }

  if (url.username || url.password) return 'VITE_API_URL must not contain credentials: it is public in the bundle.'
  if (allowLocal) return null

  if (LOCAL_HOSTS.test(url.hostname)) {
    return (
      `VITE_API_URL points at ${url.hostname}: a production build would ship pointing at the developer's machine. ` +
      'To test a production build locally, run it with ALLOW_LOCAL_API_URL=1.'
    )
  }
  if (url.protocol !== 'https:') {
    return `VITE_API_URL must use https in a production build (got "${url.protocol}//"): tokens would travel unencrypted.`
  }
  return null
}

/** Throws (failing the build) when the production environment is not fit to ship. */
export function assertProductionEnv(env: Record<string, string | undefined>) {
  const problem = validateApiUrl(env.VITE_API_URL, { allowLocal: env.ALLOW_LOCAL_API_URL === '1' })
  if (problem) throw new Error(`\n\n  Build refused: ${problem}\n`)
}
