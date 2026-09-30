// Production builds are checked at build time (config/buildEnv.ts), so an empty value here can
// only happen in development or tests, where the local backend is the sensible default.
const configured = import.meta.env.VITE_API_URL

export const API_URL: string = configured || (import.meta.env.DEV ? 'http://localhost:8000' : '')
