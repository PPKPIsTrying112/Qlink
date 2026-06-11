import api from './api'

const KEY = 'qlink_offline_queue'

interface QueuedRequest {
  type: 'join_request'
  hangoutId: string
  queuedAt: number
}

export function getQueue(): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function saveQueue(q: QueuedRequest[]) {
  localStorage.setItem(KEY, JSON.stringify(q))
}

// Store a join request to send later (called when offline).
export function enqueueJoinRequest(hangoutId: string) {
  const q = getQueue()
  q.push({ type: 'join_request', hangoutId, queuedAt: Date.now() })
  saveQueue(q)
}

// Replay every queued request to the server. Drops duplicates, keeps failures for retry.
export async function flushQueue(): Promise<number> {
  const q = getQueue()
  if (q.length === 0) return 0
  const remaining: QueuedRequest[] = []
  for (const item of q) {
    try {
      await api.post('/api/requests', { hangoutId: item.hangoutId })
    } catch (err: any) {
      const msg = err?.response?.data?.error || ''
      if (!msg.includes('Already')) remaining.push(item)
    }
  }
  saveQueue(remaining)
  return q.length - remaining.length
}

// Register once: flush automatically whenever the browser comes back online.
let initialized = false
export function initOfflineQueue(onFlush?: (count: number) => void) {
  if (initialized) return
  initialized = true
  window.addEventListener('online', async () => {
    const sent = await flushQueue()
    if (sent > 0 && onFlush) onFlush(sent)
  })
  if (navigator.onLine) flushQueue()
}