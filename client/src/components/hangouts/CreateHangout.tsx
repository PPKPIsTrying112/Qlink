import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const VIBES = ['coffee', 'food', 'explore', 'chill']

export default function CreateHangout() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    vibe: 'chill',
    location: '',
    lat: 0,
    lng: 0,
    datetime: '',
    maxPeople: 2,
    description: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const getLocation = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }))
        setLocating(false)
      },
      () => {
        setError('Could not get your location')
        setLocating(false)
      }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/hangouts', form)
      navigate('/feed')
    } catch {
      setError('Could not create hangout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Create a hangout</h1>
        <p className="text-gray-500 text-sm mt-1">Let people know what you are up to</p>
      </header>

      {error && (
        <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-5 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section aria-label="Hangout details" className="space-y-5">
          <div>
            <label htmlFor="title" className="block text-xs font-medium text-gray-400 mb-1.5">
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 placeholder:text-gray-600"
              placeholder="What are you doing?"
              required
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="vibe" className="block text-xs font-medium text-gray-400 mb-1.5">
              Vibe
            </label>
            <select
              id="vibe"
              name="vibe"
              value={form.vibe}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              {VIBES.map(v => (
                <option key={v} value={v} className="bg-gray-900">{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="location" className="block text-xs font-medium text-gray-400 mb-1.5">
              Location
            </label>
            <div className="flex gap-2">
              <input
                id="location"
                name="location"
                type="text"
                value={form.location}
                onChange={handleChange}
                className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 placeholder:text-gray-600"
                placeholder="Where are you meeting?"
                required
                aria-required="true"
              />
              <button
                type="button"
                onClick={getLocation}
                disabled={locating}
                aria-label="Use my current location"
                className="bg-white/5 border border-white/10 text-gray-400 hover:text-white px-4 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {locating ? '...' : 'Pin'}
              </button>
            </div>
            {form.lat !== 0 && (
              <p className="text-xs text-amber-400 mt-1.5" aria-live="polite">
                Location pinned
              </p>
            )}
          </div>

          <div>
            <label htmlFor="datetime" className="block text-xs font-medium text-gray-400 mb-1.5">
              When
            </label>
            <input
              id="datetime"
              name="datetime"
              type="datetime-local"
              value={form.datetime}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              required
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="maxPeople" className="block text-xs font-medium text-gray-400 mb-1.5">
              Max people
            </label>
            <input
              id="maxPeople"
              name="maxPeople"
              type="number"
              min="2"
              max="20"
              value={form.maxPeople}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              required
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-medium text-gray-400 mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 placeholder:text-gray-600 resize-none"
              placeholder="Tell people what to expect..."
              required
              aria-required="true"
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-semibold py-3 rounded-xl text-sm transition-all"
        >
          {loading ? 'Creating...' : 'Create hangout'}
        </button>
      </form>
    </main>
  )
}