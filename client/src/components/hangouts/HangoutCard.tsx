import { Link } from 'react-router-dom'

interface Hangout {
  id: string
  hostUid: string
  title: string
  vibe: string
  location: string
  datetime: string
  maxPeople: number
  description: string
}

const vibeColors: Record<string, string> = {
  coffee: 'bg-amber-400/10 text-amber-400',
  food: 'bg-orange-400/10 text-orange-400',
  explore: 'bg-blue-400/10 text-blue-400',
  chill: 'bg-purple-400/10 text-purple-400',
}

export default function HangoutCard({ hangout }: { hangout: Hangout }) {
  const date = new Date(hangout.datetime)

  return (
    <article className="bg-[#12121f] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
      <Link to={`/hangouts/${hangout.id}`} className="block">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-white font-semibold text-lg leading-tight">
            {hangout.title}
          </h2>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ml-3 shrink-0 ${vibeColors[hangout.vibe] || 'bg-gray-400/10 text-gray-400'}`}>
            {hangout.vibe}
          </span>
        </div>

        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
          {hangout.description}
        </p>

        <footer className="flex items-center gap-4 text-xs text-gray-500">
            <span>{hangout.location}</span>
            <span>·</span>
            <span>{date.toLocaleDateString()}</span>
            <span>·</span>
            <span>{hangout.maxPeople} spots</span>
        </footer>
      </Link>
    </article>
  )
}