import { createContext, useContext, useEffect, useState, useRef } from 'react'
import type { ReactNode } from 'react'
import { auth } from '../firebase'
import api from '../services/api'

interface Notification {
  id?: string
  type: string
  hangoutId?: string
  hangoutTitle?: string
  requestId?: string
  fromUid?: string
  read?: boolean
  createdAt?: any
}

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  markAllRead: () => void
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
})

export const useNotifications = () => useContext(NotificationsContext)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    let cancelled = false

    async function connect() {
      const user = auth.currentUser
      if (!user) return

      // Load history first so the Alerts page isn't empty on open.
      try {
        const res = await api.get('/api/notifications')
        if (!cancelled) {
          setNotifications(res.data)
          setUnreadCount(res.data.filter((n: Notification) => !n.read).length)
        }
      } catch {}

      // Open the live stream. EventSource can't send headers,
      // so the token goes in the URL (verified server-side).
      const token = await user.getIdToken()
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const es = new EventSource(`${base}/api/notifications/stream?token=${token}`)
      esRef.current = es

      es.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'connected') return // ignore the handshake ping
        setNotifications(prev => [data, ...prev])
        setUnreadCount(prev => prev + 1)
      }

      es.onerror = () => {
        // A non-200 (e.g. expired token) stops EventSource; reconnect fresh.
        es.close()
        if (!cancelled) setTimeout(connect, 3000)
      }
    }

    // Reconnect whenever auth settles (login/logout).
    const unsub = auth.onAuthStateChanged(() => {
      esRef.current?.close()
      connect()
    })

    return () => {
      cancelled = true
      unsub()
      esRef.current?.close()
    }
  }, [])

  const markAllRead = async () => {
    setUnreadCount(0) // update the badge instantly
    try {
      await api.put('/api/notifications/read') // persist so it stays read after refresh
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch {
      // if it fails, the badge will just reappear on refresh — not critical
    }
  }

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  )
}