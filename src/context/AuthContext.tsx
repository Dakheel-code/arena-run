import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AuthState } from '../types'
import { api } from '../lib/api'

interface AuthContextType extends AuthState {
  login: () => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })

  const refreshUser = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setState({ user: null, isLoading: false, isAuthenticated: false })
      return
    }

    try {
      const { user } = await api.getUser()
      setState({ user, isLoading: false, isAuthenticated: true })
    } catch {
      localStorage.removeItem('auth_token')
      setState({ user: null, isLoading: false, isAuthenticated: false })
    }
  }

  useEffect(() => {
    // Check for token in URL (after OAuth callback)
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      localStorage.setItem('auth_token', token)
      window.history.replaceState({}, '', window.location.pathname)
    }

    refreshUser()
  }, [])

  const login = async () => {
    const { url } = await api.getAuthUrl()
    window.location.href = url
  }

  const logout = () => {
    api.logout()
    setState({ user: null, isLoading: false, isAuthenticated: false })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
