import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/feed', label: 'Home', icon: '⊞' },
  { path: '/explore', label: 'Explore', icon: '◎' },
  { path: '/create', label: 'Create', icon: '＋' },
  { path: '/notifications', label: 'Alerts', icon: '◐' },
  { path: '/profile', label: 'Profile', icon: '◯' },
]

export default function NavBar() {
  const location = useLocation()

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#12121f] border-t border-white/5 z-50"
           aria-label="Main navigation">
        <ul className="flex items-center justify-around px-2 py-3">
          {navItems.map(item => {
            const active = location.pathname === item.path
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${
                    active ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
                  }`}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="text-xl" aria-hidden="true">{item.icon}</span>
                  <span className="text-xs">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Desktop left sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-56 bg-[#12121f] border-r border-white/5 flex-col p-6 z-50"
           aria-label="Main navigation">
        <header className="mb-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
              <span className="text-black font-black text-sm">Q</span>
            </div>
            <span className="text-white font-bold text-lg">QLink</span>
          </div>
        </header>

        <ul className="flex flex-col gap-1">
          {navItems.map(item => {
            const active = location.pathname === item.path
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    active
                      ? 'bg-amber-400/10 text-amber-400'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="text-lg" aria-hidden="true">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}