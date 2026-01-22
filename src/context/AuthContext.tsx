import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react'
import { AuthState } from '../types'

interface AuthContextType extends AuthState {
  login: () => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  token: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

// Refresh token 1 day before expiration
const REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })
  const [token, setToken] = useState<string | null>(null)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Function to refresh the token from the server
  const refreshTokenFromServer = useCallback(async (currentToken: string) => {
    try {
      console.log('Refreshing token...')
      const response = await fetch('/.netlify/functions/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
      })

      if (!response.ok) {
        console.error('Failed to refresh token, logging out...')
        localStorage.removeItem('auth_token')
        setToken(null)
        setState({ user: null, isLoading: false, isAuthenticated: false })
        return null
      }

      const { token: newToken } = await response.json()
      localStorage.setItem('auth_token', newToken)
      setToken(newToken)
      console.log('Token refreshed successfully')
      return newToken
    } catch (error) {
      console.error('Error refreshing token:', error)
      return null
    }
  }, [])

  // Schedule token refresh
  const scheduleTokenRefresh = useCallback((authToken: string, expirationTime: number) => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }

    const timeUntilRefresh = expirationTime - Date.now() - REFRESH_THRESHOLD_MS
    
    if (timeUntilRefresh > 0) {
      console.log(`Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`)
      refreshTimerRef.current = setTimeout(async () => {
        const newToken = await refreshTokenFromServer(authToken)
        if (newToken) {
          try {
            const payload = JSON.parse(atob(newToken.split('.')[1]))
            scheduleTokenRefresh(newToken, payload.exp)
          } catch (e) {
            console.error('Failed to schedule next refresh:', e)
          }
        }
      }, timeUntilRefresh)
    } else {
      // Token is about to expire or already expired, refresh immediately
      refreshTokenFromServer(authToken)
    }
  }, [refreshTokenFromServer])

  const refreshUser = async () => {
    const authToken = localStorage.getItem('auth_token')
    if (!authToken) {
      setState({ user: null, isLoading: false, isAuthenticated: false })
      return
    }

    try {
      // Decode JWT token to get user data
      const payload = JSON.parse(atob(authToken.split('.')[1]))
      
      // Check if token is expired
      if (payload.exp && payload.exp < Date.now()) {
        // Try to refresh the token instead of logging out
        console.log('Token expired, attempting to refresh...')
        const newToken = await refreshTokenFromServer(authToken)
        if (!newToken) {
          localStorage.removeItem('auth_token')
          setToken(null)
          setState({ user: null, isLoading: false, isAuthenticated: false })
          return
        }
        // Re-decode the new token
        const newPayload = JSON.parse(atob(newToken.split('.')[1]))
        scheduleTokenRefresh(newToken, newPayload.exp)
        setState({ 
          user: { 
            id: newPayload.discord_id,
            discord_id: newPayload.discord_id, 
            username: newPayload.username,
            avatar: newPayload.avatar || null,
            is_admin: newPayload.is_admin || false
          }, 
          isLoading: false, 
          isAuthenticated: true 
        })
        return
      }

      setToken(authToken)
      
      // Schedule token refresh before expiration
      scheduleTokenRefresh(authToken, payload.exp)
      
      setState({ 
        user: { 
          id: payload.discord_id,
          discord_id: payload.discord_id, 
          username: payload.username,
          avatar: payload.avatar || null,
          is_admin: payload.is_admin || false
        }, 
        isLoading: false, 
        isAuthenticated: true 
      })
    } catch (error) {
      console.error('Failed to decode token:', error)
      localStorage.removeItem('auth_token')
      setState({ user: null, isLoading: false, isAuthenticated: false })
    }
  }

  useEffect(() => {
    refreshUser()
    
    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [])

  const login = async () => {
    // For public access, just mark as authenticated
    refreshUser()
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setToken(null)
    setState({ user: null, isLoading: false, isAuthenticated: false })
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser, token }}>
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
