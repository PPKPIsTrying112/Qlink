import { useEffect, useState } from 'react'
import api from '../../services/api'
import HangoutCard from './HangoutCard'

interface Hangout {
  id: string
  hostUid: string
  title: string
  vibe: string
  location: string
  lat: number
  lng: number
  datetime: string
  maxPeople: number
  description: string
  status: string
}

export default function FeedPage() {
  const [hangouts, setHangouts] = useState<Hangout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchHangouts = async () => {
      try {
        const res = await api.get('/api/hangouts')
        setHangouts(res.data)
      } catch {
        setError('Could not load hangouts')
      } finally {
        setLoading(false)
      }
    }
    fetchHangouts()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" aria-live="polite" aria-busy="true">
      <div className="text-gray-400">Loading hangouts...</div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-red-400">{error}</div>
    </div>
  )

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Hangouts near you</h1>
        <p className="text-gray-400 text-sm mt-1">Find your people, find your vibe</p>
      </header>

      {hangouts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400">No hangouts yet.</p>
          <p className="text-gray-400 text-sm mt-1">Be the first to create one.</p>
        </div>
      ) : (
        <section className="space-y-4" aria-label="Hangout listings">
          {hangouts.map(hangout => (
            <HangoutCard key={hangout.id} hangout={hangout} />
          ))}
        </section>
      )}
    </main>
  )
}