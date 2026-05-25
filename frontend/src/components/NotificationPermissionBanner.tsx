import { useState } from 'react'
import { Bell, BellOff, X } from 'lucide-react'
import { useNotificationSocket } from '@/contexts/NotificationSocketContext'
import { useAuth } from '@/contexts/AuthContext'

export function NotificationPermissionBanner() {
  const { user } = useAuth()
  const { notificationPermission, requestNotificationPermission } = useNotificationSocket()
  const [dismissed, setDismissed] = useState(false)

  // Only show to logged-in users when permission hasn't been decided yet
  if (!user || dismissed) return null
  if (notificationPermission !== 'default') return null

  return (
    <div className="relative z-40 border-b border-sky-200 bg-sky-50 px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <Bell className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
        <p className="flex-1 text-sm text-sky-900">
          <span className="font-semibold">Enable notifications</span>
          {' '}to receive real-time alerts for announcements, certificate reminders, and updates.
        </p>
        <button
          type="button"
          className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 active:scale-95"
          onClick={() => void requestNotificationPermission()}
        >
          Enable
        </button>
        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 text-sky-600 transition hover:bg-sky-100"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function NotificationPermissionDeniedHint() {
  const { notificationPermission } = useNotificationSocket()
  const [dismissed, setDismissed] = useState(false)

  if (notificationPermission !== 'denied' || dismissed) return null

  return (
    <div className="relative z-40 border-b border-amber-200 bg-amber-50 px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <BellOff className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        <p className="flex-1 text-sm text-amber-900">
          Browser notifications are blocked. To re-enable, click the lock icon in your browser's address bar and allow notifications for this site.
        </p>
        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 text-amber-600 transition hover:bg-amber-100"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
