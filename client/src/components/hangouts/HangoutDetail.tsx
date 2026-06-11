import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { enqueueJoinRequest } from '../../services/offlineQueue'

interface Hangout {
  id: string
  hostUid: string
  title: string
  vibe: string
  location: string
  datetime: string
  maxPeople: number
  description: string
  status: string
}

const vibeColors: Record<string, string> = {
  coffee: 'bg-amber-400/10 text-amber-400',
  food: 'bg-orange-400/10 text-orange-400',
  explore: 'bg-blue-400/10 text-blue-400',
  chill: 'bg-purple-400/10 text-purple-400',
}

export default function HangoutDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [hangout, setHangout] = useState<Hangout | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requested, setRequested] = useState(false)
  const [queued, setQueued] = useState(false)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    const fetchHangout = async () => {
      try {
        const res = await api.get(`/api/hangouts/${id}`)
        setHangout(res.data)
      } catch {
        setError('Could not load this hangout')
      } finally {
        setLoading(false)
      }
    }
    fetchHangout()
  }, [id])

  const handleRequest = async () => {
    setWorking(true)
    setError('')

    // Offline → queue it instead of failing, sync when back online.
    if (!navigator.onLine) {
      enqueueJoinRequest(id!)
      setQueued(true)
      setRequested(true)
      setWorking(false)
      return
    }

    try {
      await api.post('/api/requests', { hangoutId: id })
      setRequested(true)
    } catch (err: any) {
      // No err.response = network died mid-request → queue it too
      if (!err.response) {
        enqueueJoinRequest(id!)
        setQueued(true)
        setRequested(true)
      } else {
        setError(err.response?.data?.error || 'Could not send request')
        if (err.response?.data?.error?.includes('Already')) setRequested(true)
      }
    } finally {
      setWorking(false)
    }
  }

  const handleClose = async () => {
    setWorking(true)
    try {
      await api.delete(`/api/hangouts/${id}`)
      navigate('/feed')
    } catch {
      setError('Could not close this hangout')
      setWorking(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" aria-live="polite" aria-busy="true">
      <div className="text-gray-400">Loading...</div>
    </div>
  )

  if (error && !hangout) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-red-400">{error}</div>
    </div>
  )

  if (!hangout) return null

  const isHost = user?.uid === hangout.hostUid
  const isClosed = hangout.status !== 'active'
  const date = new Date(hangout.datetime)

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <button
        onClick={() => navigate('/feed')}
        className="text-gray-500 hover:text-gray-300 text-sm mb-5"
      >
        ← Back to feed
      </button>

      <article className="bg-[#12121f] border border-white/5 rounded-2xl p-6">
        <header className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold text-white leading-tight">{hangout.title}</h1>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ml-3 shrink-0 ${vibeColors[hangout.vibe] || 'bg-gray-400/10 text-gray-400'}`}>
            {hangout.vibe}
          </span>
        </header>

        <p className="text-gray-300 text-sm mb-5">{hangout.description}</p>

        <dl className="space-y-2 text-sm border-t border-white/5 pt-4 mb-6">
          <div className="flex justify-between">
            <dt className="text-gray-500">Where</dt>
            <dd className="text-gray-300">{hangout.location}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">When</dt>
            <dd className="text-gray-300">{date.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Spots</dt>
            <dd className="text-gray-300">{hangout.maxPeople}</dd>
          </div>
        </dl>

        {error && (
          <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        {isClosed ? (
          <p className="text-gray-500 text-sm text-center py-2">This hangout is closed.</p>
        ) : isHost ? (
          <button
            onClick={handleClose}
            disabled={working}
            className="w-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 disabled:opacity-50 font-semibold py-3 rounded-xl text-sm transition-all"
          >
            {working ? 'Closing...' : 'Close this hangout'}
          </button>
        ) : (
          <button
            onClick={handleRequest}
            disabled={working || requested}
            className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-semibold py-3 rounded-xl text-sm transition-all"
          >
            {queued
              ? 'Queued — will send when online ⏳'
              : requested
              ? 'Requested ✓'
              : working
              ? 'Sending...'
              : 'Request to join'}
          </button>
        )}
      </article>
    </main>
  )
}