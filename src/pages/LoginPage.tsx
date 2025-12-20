import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { XCircle, ShieldAlert } from 'lucide-react'

export function LoginPage() {
  const { login, isLoading } = useAuth()
  const { settings } = useSettings()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      switch (errorParam) {
        case 'not_in_guild':
          setError('You do not have permission to access. Contact admin to get authorization')
          break
        case 'missing_role':
          setError('You do not have permission to access. Contact admin to get authorization')
          break
        case 'not_allowed':
          setError('You do not have permission to access. Contact admin to get authorization')
          break
        case 'token_exchange':
          setError('Failed to authenticate with Discord. Please try again')
          break
        case 'unknown':
          setError('An unknown error occurred. Please try again')
          break
        default:
          setError('Authentication failed. Please try again')
      }
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-discord-darker px-4">
      <div className="card max-w-md w-full text-center animate-fade-in-up">
        <div className="mb-8 animate-slide-down">
          <h1 className="text-3xl sm:text-4xl font-bold text-theme-light mb-2 animate-glow">
            {settings.siteName}
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">{settings.siteDescription}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg animate-shake">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-left">
                <h3 className="text-red-400 font-semibold mb-1">Access Denied</h3>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-4 animate-float">
            <img 
              src="https://regulators.us/logo.png" 
              alt="Logo" 
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
          <p className="text-gray-300 text-sm sm:text-base animate-fade-in">
            Sign in with Discord to access exclusive content
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={login}
            disabled={isLoading}
            className="btn-discord w-full"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Sign in with Discord
              </>
            )}
          </button>

          <p className="text-xs text-gray-500">
            Contact admin to get access permission
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-600">
            Developed by{' '}
            <a 
              href="https://discord.com/users/691802404244422688" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-theme-light hover:underline"
            >
              Dakheel
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
