import { useSyncExternalStore } from 'react'
import { Snackbar } from '../ui'
import { dismissNotification, getNotification, subscribeNotifications } from '../../lib/notifier'

/** Renders the app-wide notification (errors raised from React Query's caches). Mount once. */
export function NotificationHost() {
  const notification = useSyncExternalStore(subscribeNotifications, getNotification)

  return (
    <Snackbar
      // Keyed so a new message replaces the previous one instead of updating it in place.
      key={notification?.id ?? 'none'}
      open={notification !== null}
      message={notification?.message ?? ''}
      severity={notification?.severity ?? 'error'}
      duration={6000}
      onClose={dismissNotification}
    />
  )
}
