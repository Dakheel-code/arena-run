import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { Home, Video, Users, Settings, LogOut, Shield, History, Plus } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const { settings } = useSettings()
  const location = useLocation()

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/videos', icon: Video, label: 'Videos' },
    { path: '/new-run', icon: Plus, label: 'New Run', highlight: true },
  ]

  const adminItems = [
    { path: '/admin', icon: Shield, label: 'Dashboard' },
    { path: '/admin/videos', icon: Video, label: 'Manage Videos' },
    { path: '/admin/members', icon: Users, label: 'Members' },
    { path: '/admin/sessions', icon: History, label: 'Sessions Log' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-discord-dark border-l border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <img 
              src="https://regulators.us/logo.png" 
              alt="Logo" 
              className="w-10 h-10 object-contain"
            />
            <div>
              <h1 className="text-lg font-bold text-theme-light">{settings.siteName}</h1>
              <p className="text-xs text-gray-400">{settings.siteDescription}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-theme text-white'
                  : (item as any).highlight
                    ? 'bg-theme/20 text-theme-light hover:bg-theme/30 border border-theme/30'
                    : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}

          {user?.is_admin && (
            <>
              <div className="border-t border-gray-700 my-4" />
              <p className="text-xs text-gray-500 px-4 mb-2">Admin</p>
              {adminItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-theme text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <img
              src={`https://cdn.discordapp.com/avatars/${user?.discord_id}/${user?.avatar}.png`}
              alt={user?.username}
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.username}</p>
              <p className="text-xs text-gray-400">{user?.game_id || 'Member'}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
