import { useEffect, useCallback } from 'react'

interface WatchHistoryItem {
  videoId: string
  currentTime: number
  duration: number
  timestamp: number
}

const WATCH_HISTORY_KEY = 'video_watch_history'
const SAVE_INTERVAL = 5000 // Save every 5 seconds

export function useWatchHistory(videoId: string) {
  const saveProgress = useCallback((currentTime: number, duration: number) => {
    if (!videoId || !currentTime || !duration) return
    
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
