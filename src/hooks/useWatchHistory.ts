import { useCallback, useEffect, useRef } from 'react'

interface WatchHistoryItem {
  videoId: string
  currentTime: number
  duration: number
  timestamp: number
}

const WATCH_HISTORY_KEY = 'video_watch_history'

export function useWatchHistory(videoId: string) {
  const watchTimeRef = useRef<number>(0)
  const sessionLoggedRef = useRef<boolean>(false)

  useEffect(() => {
    // Log session when user leaves or after significant watch time
    const logSession = async () => {
      if (sessionLoggedRef.current) return
      if (watchTimeRef.current < 5) return // Only log if watched at least 5 seconds
      
      try {
        const userStr = localStorage.getItem('user')
        if (!userStr) return
        
        const user = JSON.parse(userStr)
        if (!user?.discord_id) return

        sessionLoggedRef.current = true

        await fetch('/.netlify/functions/log-watch-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            video_id: videoId,
            discord_id: user.discord_id,
            watch_seconds: Math.floor(watchTimeRef.current)
          })
        })

        console.log('Watch session logged:', Math.floor(watchTimeRef.current), 'seconds')
      } catch (error) {
        console.error('Failed to log watch session:', error)
      }
    }

    // Log session every 30 seconds if still watching
    const interval = setInterval(() => {
      if (watchTimeRef.current >= 30) {
        logSession()
      }
    }, 30000)

    // Log session when component unmounts (user leaves)
    return () => {
      clearInterval(interval)
      logSession()
    }
  }, [videoId])

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
