import { useEffect, useRef, useState } from 'react'

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const isRefreshing = useRef(false)

  useEffect(() => {
    let touchStartY = 0
    
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        touchStartY = e.touches[0].clientY
        startY.current = touchStartY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && !isRefreshing.current) {
        const touchY = e.touches[0].clientY
        const distance = touchY - startY.current

        if (distance > 0) {
          setIsPulling(true)
          setPullDistance(Math.min(distance, 100))
        }
      }
    }

    const handleTouchEnd = async () => {
      if (pullDistance > 60 && !isRefreshing.current) {
        isRefreshing.current = true
        setPullDistance(60)
        
        try {
          await onRefresh()
        } finally {
          isRefreshing.current = false
          setIsPulling(false)
          setPullDistance(0)
        }
      } else {
        setIsPulling(false)
        setPullDistance(0)
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onRefresh, pullDistance])

  return { isPulling, pullDistance, isRefreshing: isRefreshing.current }
}
