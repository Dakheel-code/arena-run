import { useCallback, useEffect, useRef } from 'react'

interface WatchHistoryItem {
  videoId: string
  currentTime: number
  duration: number
  timestamp: number
}

const WATCH_HISTORY_KEY = 'video_watch_history'

export function useWatchHistory(videoId: string) {
  const sessionIdRef = useRef<string | null>(null)
  const watchTimeRef = useRef<number>(0)

  useEffect(() => {
    // Start tracking session when component mounts
    const startSession = async () => {
      try {
        const userStr = localStorage.getItem('user')
        if (!userStr) return
        
        const user = JSON.parse(userStr)
        if (!user?.discord_id) return

        const response = await fetch('/.netlify/functions/track-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            video_id: videoId,
            discord_id: user.discord_id,
            action: 'start'
          })
        })

        if (response.ok) {
          const data = await response.json()
          sessionIdRef.current = data.session_id
        }
      } catch (error) {
        console.error('Failed to start session:', error)
      }
    }

    startSession()

    // Update session every 30 seconds
    const interval = setInterval(() => {
      if (sessionIdRef.current) {
        updateSession()
      }
    }, 30000)

    return () => {
      clearInterval(interval)
      if (sessionIdRef.current) {
        updateSession()
      }
    }
  }, [videoId])

  const updateSession = async () => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr || !sessionIdRef.current) return
      
      const user = JSON.parse(userStr)
      if (!user?.discord_id) return

      await fetch('/.netlify/functions/track-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          video_id: videoId,
          discord_id: user.discord_id,
          session_id: sessionIdRef.current,
          action: 'update',
          watch_seconds: Math.floor(watchTimeRef.current)
        })
      })
    } catch (error) {
      console.error('Failed to update session:', error)
    }
  }

  const saveProgress = useCallback((currentTime: number, duration: number) => {
    if (!videoId || !currentTime || !duration) return
    
    watchTimeRef.current = currentTime

    try {
      const history = getWatchHistory()
      const item: WatchHistoryItem = {
        videoId,
        currentTime,
        duration,
        timestamp: Date.now()
      }
      
      history[videoId] = item
      localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history))
    } catch (error) {
      console.error('Failed to save watch history:', error)
    }
  }, [videoId])

  const getProgress = useCallback((): number | null => {
    if (!videoId) return null
    
    try {
      const history = getWatchHistory()
      const item = history[videoId]
      
      if (item && item.currentTime > 5 && item.currentTime < item.duration - 10) {
        return item.currentTime
      }
    } catch (error) {
      console.error('Failed to get watch history:', error)
    }
    
    return null
  }, [videoId])

  const clearProgress = useCallback(() => {
    if (!videoId) return
    
    try {
      const history = getWatchHistory()
      delete history[videoId]
      localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history))
    } catch (error) {
      console.error('Failed to clear watch history:', error)
    }
  }, [videoId])

  return { saveProgress, getProgress, clearProgress }
}

function getWatchHistory(): Record<string, WatchHistoryItem> {
  try {
    const data = localStorage.getItem(WATCH_HISTORY_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}
