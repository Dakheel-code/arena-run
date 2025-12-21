import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AuthState } from '../types'

interface AuthContextType extends AuthState {
  login: () => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  token: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: false, // No loading for public access
    isAuthenticated: true, // Always authenticated for public access
  })

  const refreshUser = async () => {
    // For public access, set a mock user with admin privileges for full access
    setState({ 
      user: { 
        id: 'public-admin', 
        discord_id: 'public', 
        username: 'Admin User',
        avatar: 'default-avatar', // Required field
        is_admin: true 
      }, 
      isLoading: false, 
      isAuthenticated: true 
    })
  }

  useEffect(() => {
    // Skip OAuth checks for public access
    refreshUser()
  }, [])

  const login = async () => {
    // For public access, just mark as authenticated
    refreshUser()
  }

  const logout = () => {
    // For public access, keep user authenticated
    refreshUser()
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser, token: localStorage.getItem('auth_token') }}>
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
