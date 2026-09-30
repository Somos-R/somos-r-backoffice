// A lazily loaded page (a separate JS file) can fail to download: the connection dropped, or a
// new version was deployed and the old file names no longer exist. Browsers word it differently.
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|Loading chunk|Loading CSS chunk/i

export function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && CHUNK_ERROR.test(error.message)
}
