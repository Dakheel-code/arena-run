import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AuthState } from '../types'
import { api } from '../lib/api'

interface AuthContextType extends AuthState {
  login: () => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  refreshToken: () => Promise<void>
  token: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })

  const refreshUser = async () => {
    const authToken = localStorage.getItem('auth_token')
    if (!authToken) {
      setState({ user: null, isLoading: false, isAuthenticated: false })
      return
    }


    try {
      // Decode JWT token to get user data
      const payload = JSON.parse(atob(authToken.split('.')[1]))
      
      setState({ 
        user: { 
          id: payload.discord_id,
          discord_id: payload.discord_id, 
          username: payload.username,
          avatar: payload.avatar || null,
          is_admin: payload.is_admin || false,
          role: payload.role || 'member'
        }, 
        isLoading: false, 
        isAuthenticated: true 
      })
    } catch (error) {
      console.error('Failed to decode token:', error)
      setState({ user: null, isLoading: false, isAuthenticated: false })
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const login = async () => {
    // For public access, just mark as authenticated
    refreshUser()
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setState({ user: null, isLoading: false, isAuthenticated: false })
    window.location.href = '/'
  }

  const refreshToken = async () => {
    try {
      const { token: newToken } = await api.refreshToken()
      localStorage.setItem('auth_token', newToken)
      await refreshUser()
    } catch (error) {
      console.error('Failed to refresh token:', error)
      logout()
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser, refreshToken, token: localStorage.getItem('auth_token') }}>
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
