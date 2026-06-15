/** Browser notifications when the tab is in the background (WebSocket still delivers). */

import { brandLogoUrl } from '@/config/brandAssets'

export async function registerNotificationServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw-notifications.js', { scope: '/' })
  } catch {
    /* ignore — WS + in-tab UI still work */
  }
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/**
 * Show a system notification when the document is hidden.
 * @returns true if a system notification was shown (skip in-tab sound).
 */
export async function showBackgroundNotification(title: string, body: string): Promise<boolean> {
  if (typeof document === 'undefined' || document.visibilityState === 'visible') return false
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
  try {
    const n = new Notification(title, {
      body,
      tag: 'abc-notification',
      icon: brandLogoUrl,
    })
    n.onclick = () => {
      window.focus()
      n.close()
      window.location.assign('/notifications')
    }
    return true
  } catch {
    return false
  }
}
