import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { getToken } from '@/api/client'
import { qk } from '@/api/queryKeys'
import { useAuth } from '@/contexts/AuthContext'
import {
  ensureNotificationPermission,
  registerNotificationServiceWorker,
  showBackgroundNotification,
} from '@/lib/notificationBackground'
import type { AppNotification } from '@/types'

type Ctx = {
  connected: boolean
  unreadCount: number
  playSound: () => void
}

const NotificationSocketContext = createContext<Ctx>({
  connected: false,
  unreadCount: 0,
  playSound: () => {},
})

function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? ''
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.value = 0.08
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    /* ignore */
  }
}

export function NotificationSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const playSound = useCallback(() => playNotificationSound(), [])

  useEffect(() => {
    void registerNotificationServiceWorker()
  }, [])

  useEffect(() => {
    const list = qc.getQueryData<AppNotification[]>(qk.notifications)
    if (list) setUnreadCount(list.filter((n) => !n.read).length)
  }, [qc])

  useEffect(() => {
    if (user) void ensureNotificationPermission()
  }, [user?.email])

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setConnected(false)
      return
    }
    const token = getToken()
    if (!token) return

    const base = apiBase().replace(/\/$/, '')
    const socket = io(`${base}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelayMax: 8000,
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('notification', (payload: AppNotification) => {
      void (async () => {
        const bg = await showBackgroundNotification(payload.title, payload.body)
        if (!bg) playNotificationSound()
      })()
      qc.setQueryData<AppNotification[]>(qk.notifications, (old = []) => {
        if (old.some((n) => n.id === payload.id)) return old
        return [payload, ...old]
      })
      setUnreadCount((c) => c + 1)
    })
    socket.on('pong', () => {})

    const ping = window.setInterval(() => {
      if (socket.connected) socket.emit('ping')
    }, 25000)

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !socket.connected) {
        socket.connect()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(ping)
      document.removeEventListener('visibilitychange', onVisible)
      socket.disconnect()
    }
  }, [user?.email, qc])

  const value = useMemo(
    () => ({ connected, unreadCount, playSound }),
    [connected, unreadCount, playSound],
  )

  return (
    <NotificationSocketContext.Provider value={value}>{children}</NotificationSocketContext.Provider>
  )
}

export function useNotificationSocket() {
  return useContext(NotificationSocketContext)
}
