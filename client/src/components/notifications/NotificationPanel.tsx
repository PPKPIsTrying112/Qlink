import { useEffect, useState } from 'react'
import { useNotifications } from '../../context/NotificationsContext'
import api from '../../services/api'

const LABELS: Record<string, string> = {
  join_request: 'requested to join your hangout',
  approved: 'approved your request to join',
  declined: 'declined your request to join',
}

export default function NotificationsPanel() {
  const { notifications, markAllRead } = useNotifications()
  const [handled, setHandled] = useState<Record<string, 'approved' | 'declined'>>({})
  const [working, setWorking] = useState<string | null>(null)

  // Opening the page clears the unread badge.
  useEffect(() => { markAllRead() }, [])

  const respond = async (requestId: string, status: 'approved' | 'declined') => {
    setWorking(requestId)
    try {
      await api.put(`/api/requests/${requestId}`, { status })
      setHandled(prev => ({ ...prev, [requestId]: status }))
    } catch {
      // request may already be handled; ignore
    } finally {
      setWorking(null)
    }
  }

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
          {notifications.map((n, i) => {
            const isRequest = n.type === 'join_request' && n.requestId
            const result = n.requestId ? handled[n.requestId] : undefined
            return (
              <li
                key={n.id || i}
                className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-gray-300"
              >
                <div>
                  <span className="text-white font-medium">Someone </span>
                  {LABELS[n.type] || 'sent you an update'}
                  {n.hangoutTitle && <span className="text-amber-400"> · {n.hangoutTitle}</span>}
                </div>

                {isRequest && (
                  <div className="mt-3 flex gap-2">
                    {result ? (
                      <span className={`text-xs font-medium ${result === 'approved' ? 'text-green-400' : 'text-gray-500'}`}>
                        {result === 'approved' ? 'Approved ✓' : 'Declined'}
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => respond(n.requestId!, 'approved')}
                          disabled={working === n.requestId}
                          className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-semibold px-4 py-1.5 rounded-lg text-xs transition-all"
                        >
                          {working === n.requestId ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => respond(n.requestId!, 'declined')}
                          disabled={working === n.requestId}
                          className="bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-50 px-4 py-1.5 rounded-lg text-xs transition-all"
                        >
                          Decline
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}