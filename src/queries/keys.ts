// Every React Query key of the app, in one place (same rules as somos-r-web): the first element is
// the resource root, so invalidating a root reloads everything under it.
export const queryKeys = {
  /** The signed-in Somos R account (`GET /admin/me`). */
  me: ['me'] as const,
}
