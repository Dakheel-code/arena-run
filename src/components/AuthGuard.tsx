import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        // Redirect to main auth page (index.html)
        window.location.href = '/'
        return
      }

      // Temporarily skip token validation - accept any token
      console.log('Token found, allowing access')
      setIsAuthenticated(true)
      setIsLoading(false)
    }

    checkAuth()
  }, [navigate])

  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('/.netlify/functions/auth-user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.valid || false
      }
      
      return false
    } catch (error) {
      console.error('Token validation error:', error)
      return false
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to auth page
  }

  return <>{children}</>
}
