import { Home, Video, History, KeyRound, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const triggerHapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10)
  }
}

export function BottomNav() {
  const location = useLocation()
  const { user } = useAuth()
  
  // Hide BottomNav completely for non-admin users
  if (!user?.is_admin) {
    return null
  }
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }
  
  const navItems = [
    { path: '/', icon: Home, label: 'Home', badge: 0 },
    { path: '/admin/videos', icon: Video, label: 'Videos', badge: 0 },
    { path: '/admin/sessions', icon: History, label: 'Sessions', badge: 0 },
    { path: '/admin/login-logs', icon: KeyRound, label: 'Login', badge: 0 },
    { path: '/admin/settings', icon: Settings, label: 'Settings', badge: 0 },
  ]
  
  const handleClick = () => {
    triggerHapticFeedback()
  }
  
  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around" style={{ height: '64px' }}>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleClick}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                active
                  ? 'text-theme-light scale-105'
                  : 'text-gray-400 hover:text-gray-300 active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon 
                  size={22} 
                  className={`transition-all duration-200 ${
                    active ? 'drop-shadow-[0_0_8px_rgba(var(--tc-light),0.5)]' : ''
                  }`}
                  strokeWidth={active ? 2.5 : 2}
                />
                
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              
              <span 
                className={`text-[10px] font-medium mt-1 transition-all duration-200 ${
                  active ? 'font-semibold' : ''
                }`}
              >
                {item.label}
              </span>
              
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-theme-light rounded-b-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
