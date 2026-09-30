// App-wide notifications, for errors that no single screen owns (403, server errors, a
// conflict on an action). Plain module with `subscribe`, like lib/session: React Query's
// caches live outside React, so they need a way to reach the UI without a component.

export type NotificationSeverity = 'error' | 'warning' | 'success' | 'info'

export interface Notification {
  id: number
  message: string
  severity: NotificationSeverity
}

const DEDUPE_MS = 3000

type Listener = () => void
const listeners = new Set<Listener>()

let current: Notification | null = null
let nextId = 1
let lastShown: { message: string; at: number } | null = null

function emit() {
  listeners.forEach((l) => l())
}

/** Shows a notification; an identical message within a few seconds is dropped, not stacked. */
export function notify(message: string, severity: NotificationSeverity = 'error') {
  const now = Date.now()
  if (lastShown && lastShown.message === message && now - lastShown.at < DEDUPE_MS) return
  lastShown = { message, at: now }
  current = { id: nextId++, message, severity }
  emit()
}

export function dismissNotification() {
  if (current === null) return
  current = null
  emit()
}

export const getNotification = (): Notification | null => current

export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Test helper: back to a clean slate. */
export function resetNotifier() {
  current = null
  lastShown = null
  emit()
}
