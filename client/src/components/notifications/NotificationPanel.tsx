import { useEffect } from 'react'
import { useNotifications } from '../../context/NotificationsContext'

const LABELS: Record<string, string> = {
  join_request: 'requested to join your hangout',
  approved: 'approved your request to join',
  declined: 'declined your request to join',
}

export default function NotificationsPanel() {
  const { notifications, markAllRead } = useNotifications()

  // Opening the page clears the unread badge.
  useEffect(() => { markAllRead() }, [])

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Alerts</h1>
        <p className="text-gray-500 text-sm mt-1">Who wants to hang</p>
      </header>

      {notifications.length === 0 ? (
        <p className="text-gray-500 text-sm">No alerts yet.</p>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n, i) => (
            <li
              key={n.id || i}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-gray-300"
            >
              <span className="text-white font-medium">Someone </span>
              {LABELS[n.type] || 'sent you an update'}
              {n.hangoutTitle && <span className="text-amber-400"> · {n.hangoutTitle}</span>}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}