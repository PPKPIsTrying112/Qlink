import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

interface Profile {
  name: string
  age: number
  bio: string
  photos: string[]
}

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState<Profile>({
    name: '',
    age: 0,
    bio: '',
    photos: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/api/users/${user?.uid}`)
        setProfile({ photos: [], ...res.data })
      } catch {
        setEditing(true)
      } finally {
        setLoading(false)
      }
    }
    if (user) fetchProfile()
  }, [user])

  // Drag a photo FILE from the computer onto the drop zone to add it (HTML5 Drag and Drop)
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setProfile(prev => ({ ...prev, photos: [...prev.photos, dataUrl] }))
    }
    reader.readAsDataURL(file)
  }

  const allowDrop = (e: React.DragEvent) => e.preventDefault()

  // Drag existing photos to reorder them (HTML5 Drag and Drop)
  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return

    const newPhotos = [...profile.photos]
    const dragged = newPhotos[dragIndex]
    newPhotos.splice(dragIndex, 1)
    newPhotos.splice(index, 0, dragged)

    setProfile(prev => ({ ...prev, photos: newPhotos }))
    setDragIndex(index)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Save profile fields but not photos (preview-only in this version;
      // a production version would upload photos to Firebase Storage and save the URLs)
      const { photos, ...profileWithoutPhotos } = profile
      await api.put(`/api/users/${user?.uid}`, profileWithoutPhotos)
      setEditing(false)
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2500)
    } catch {
      console.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" aria-live="polite">
      <p className="text-gray-400">Loading profile...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <button
          onClick={() => setEditing(!editing)}
          className="text-amber-400 text-sm hover:text-amber-300 transition-colors"
          aria-label={editing ? 'Cancel editing' : 'Edit profile'}
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </header>

      {savedMsg && (
        <div role="status" className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl mb-5 text-sm">
          Profile saved
        </div>
      )}

      {!editing ? (
        <section aria-label="Profile details">
          <div className="bg-[#12121f] border border-white/5 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-amber-400 flex items-center justify-center">
                <span className="text-black font-bold text-xl">
                  {profile.name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">{profile.name || 'No name yet'}</h2>
                <p className="text-gray-400 text-sm">{user?.email}</p>
                {profile.age > 0 && <p className="text-gray-400 text-sm">Age {profile.age}</p>}
              </div>
            </div>
            {profile.bio && (
              <p className="text-gray-400 text-sm">{profile.bio}</p>
            )}
          </div>

          {profile.photos.length > 0 && (
            <section aria-label="Profile photos">
              <h3 className="text-white font-medium mb-3 text-sm">Photos</h3>
              <div
                className="grid grid-cols-3 gap-2"
                role="list"
                aria-label="Drag to reorder photos"
              >
                {profile.photos.map((photo, index) => (
                  <div
                    key={index}
                    role="listitem"
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`aspect-square rounded-xl overflow-hidden cursor-grab active:cursor-grabbing border-2 transition-all ${
                      dragIndex === index ? 'border-amber-400 opacity-50' : 'border-transparent'
                    }`}
                    aria-label={`Photo ${index + 1}, drag to reorder`}
                  >
                    <img
                      src={photo}
                      alt={`Profile photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-gray-400 mb-1.5">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={profile.name}
              onChange={e => setProfile(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 placeholder:text-gray-500"
              placeholder="Your name"
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="age" className="block text-xs font-medium text-gray-400 mb-1.5">
              Age
            </label>
            <input
              id="age"
              type="number"
              value={profile.age}
              onChange={e => setProfile(prev => ({ ...prev, age: Number(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              min="18"
              max="100"
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-xs font-medium text-gray-400 mb-1.5">
              Bio
            </label>
            <textarea
              id="bio"
              value={profile.bio}
              onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 placeholder:text-gray-500 resize-none"
              placeholder="Tell people about yourself..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Photos
            </label>
            <div
              onDrop={handleFileDrop}
              onDragOver={allowDrop}
              className="border-2 border-dashed border-white/15 rounded-xl p-6 text-center text-gray-400 text-sm hover:border-amber-400/40 transition-colors"
              role="button"
              aria-label="Drag and drop a photo here to add it"
            >
              Drag a photo here to add it
            </div>

            {profile.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3" aria-label="Your photos, drag to reorder">
                {profile.photos.map((photo, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`aspect-square rounded-xl overflow-hidden cursor-grab active:cursor-grabbing border-2 transition-all ${
                      dragIndex === index ? 'border-amber-400 opacity-50' : 'border-transparent'
                    }`}
                    aria-label={`Photo ${index + 1}, drag to reorder`}
                  >
                    <img src={photo} alt={`Profile photo ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-semibold py-3 rounded-xl text-sm transition-all"
          >
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      )}

      <button
        onClick={logout}
        className="w-full mt-6 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white py-3 rounded-xl text-sm transition-all"
        aria-label="Log out of QLink"
      >
        Log out
      </button>
    </main>
  )
}