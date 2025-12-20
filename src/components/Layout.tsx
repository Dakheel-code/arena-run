import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { useLanguage } from '../context/LanguageContext'
import { Language } from '../i18n/translations'
import { Home, Video, Users, Settings, LogOut, Shield, History, Plus, Globe, ChevronDown, Menu, X, KeyRound } from 'lucide-react'
import { BottomNav } from './BottomNav'

interface LayoutProps {
  children: ReactNode
}

const LANGUAGES = [
  { code: 'en' as Language, name: 'English', flag: '🇬🇧' },
  { code: 'ar' as Language, name: 'العربية', flag: '🇸🇦' },
  { code: 'ja' as Language, name: '日本語', flag: '🇯🇵' },
  { code: 'ko' as Language, name: '한국어', flag: '🇰🇷' },
  { code: 'ru' as Language, name: 'Русский', flag: '🇷🇺' },
  { code: 'pt' as Language, name: 'Português', flag: '🇵🇹' },
  { code: 'fr' as Language, name: 'Français', flag: '🇫🇷' },
  { code: 'de' as Language, name: 'Deutsch', flag: '🇩🇪' },
]

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const { settings } = useSettings()
  const { language, setLanguage, t } = useLanguage()
  const location = useLocation()
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const currentLanguage = LANGUAGES.find(l => l.code === language) || LANGUAGES[0]

  const handleLanguageChange = (code: Language) => {
    setLanguage(code)
    setShowLanguageMenu(false)
  }

  const navItems = [
    { path: '/', icon: Home, label: t('home') },
    { path: '/new-run', icon: Plus, label: t('newRun'), highlight: true },
  ]

  const adminItems = [
    { path: '/admin', icon: Shield, label: t('dashboard') },
    { path: '/admin/videos', icon: Video, label: t('manageVideos') },
    { path: '/admin/members', icon: Users, label: t('members') },
    { path: '/admin/sessions', icon: History, label: t('sessionsLog') },
    { path: '/admin/login-logs', icon: KeyRound, label: 'Login Logs' },
    { path: '/admin/settings', icon: Settings, label: t('settings') },
  ]


  return (
    <div className="min-h-screen flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-discord-dark/95 backdrop-blur-lg border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <Link 
          to="/" 
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <img 
            src="https://regulators.us/logo.png" 
            alt="Logo" 
            className="w-8 h-8 object-contain"
          />
          <h1 className="text-sm font-bold text-theme-light">{settings.siteName}</h1>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-300 hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-discord-dark border-l border-gray-700 flex flex-col
        transform transition-transform duration-300 ease-in-out
        lg:transform-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Link 
          to="/" 
          className="hidden lg:block p-4 border-b border-gray-700 hover:bg-gray-800/30 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <img 
              src="https://regulators.us/logo.png" 
              alt="Logo" 
              className="w-10 h-10 object-contain group-hover:scale-110 transition-transform"
            />
            <div>
              <h1 className="text-lg font-bold text-theme-light group-hover:text-theme transition-colors">{settings.siteName}</h1>
              <p className="text-xs text-gray-400">{settings.siteDescription}</p>
            </div>
          </div>
        </Link>
        <div className="lg:hidden p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <img 
                src="https://regulators.us/logo.png" 
                alt="Logo" 
                className="w-8 h-8 object-contain"
              />
              <h1 className="text-sm font-bold text-theme-light">{settings.siteName}</h1>
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
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
              <p className="text-xs text-gray-500 px-4 mb-2">{t('admin')}</p>
              {adminItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
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

        {/* Language Selector */}
        <div className="px-4 py-2 border-t border-gray-700">
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
            >
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-gray-400" />
                <span>{currentLanguage.flag} {currentLanguage.name}</span>
              </div>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {showLanguageMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                      language === lang.code ? 'bg-theme/20 text-theme-light' : ''
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img
                src={user.avatar.startsWith('http') ? user.avatar : `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`}
                alt={user?.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-theme/20 flex items-center justify-center">
                <span className="text-theme-light font-bold">{user?.username?.charAt(0).toUpperCase()}</span>
              </div>
            )}
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

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 pb-20 md:pb-8">{children}</div>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <BottomNav />
    </div>
  )
}
