import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { api } from '../lib/api'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, PictureInPicture } from 'lucide-react'

interface VideoPlayerProps {
  videoId: string
  streamUid: string
}

function generateWatermarkCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  code += '-'
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function VideoPlayer({ videoId, streamUid }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [watermarkCode, setWatermarkCode] = useState('')
  const [watermarkPosition, setWatermarkPosition] = useState({ x: 10, y: 10 })
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [volume, setVolume] = useState(1)
  const [isPiPSupported, setIsPiPSupported] = useState(false)
  const watchTimeRef = useRef(0)
  const lastUpdateRef = useRef(0)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTapRef = useRef(0)
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })

  // Check PiP support
  useEffect(() => {
    setIsPiPSupported('pictureInPictureEnabled' in document)
  }, [])

  // Handle fullscreen changes and screen orientation
  useEffect(() => {
    const handleFullscreenChange = async () => {
      const isFS = !!document.fullscreenElement
      setIsFullscreen(isFS)
      
      // Auto-rotate to landscape in fullscreen on mobile
      if (isFS && 'orientation' in screen && window.innerWidth < 768) {
        try {
          await (screen.orientation as any).lock('landscape')
        } catch (err) {
          console.log('Orientation lock not supported')
        }
      } else if (!isFS && 'orientation' in screen) {
        try {
          (screen.orientation as any).unlock()
        } catch (err) {
          console.log('Orientation unlock not supported')
        }
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      if ('orientation' in screen) {
        try {
          (screen.orientation as any).unlock()
        } catch (err) {}
      }
    }
  }, [])

  // Keep screen awake during playback
  useEffect(() => {
    let wakeLock: any = null
    
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isPlaying) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen')
        } catch (err) {
          console.log('Wake lock not supported')
        }
      }
    }
    
    requestWakeLock()
    
    return () => {
      if (wakeLock) {
        wakeLock.release()
      }
    }
  }, [isPlaying])

  // Auto-hide controls
  useEffect(() => {
    if (showControls && isPlaying) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [showControls, isPlaying])

  // Generate watermark code
  useEffect(() => {
    setWatermarkCode(generateWatermarkCode())
  }, [])

  // Move watermark every 8-15 seconds - full range for portrait videos
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const moveWatermark = () => {
      // Full range: covers entire video area including corners
      setWatermarkPosition({
        x: Math.random() * 100, // 0 to 100 (full width)
        y: Math.random() * 100, // 0 to 100 (full height)
      })
      // Schedule next move with random delay
      timeoutId = setTimeout(moveWatermark, 8000 + Math.random() * 7000)
    }

    // Move immediately on mount
    moveWatermark()

    return () => clearTimeout(timeoutId)
  }, [])

  // Initialize player and session
  useEffect(() => {
    const initPlayer = async () => {
      try {
        setIsLoading(true)
        const { token, session } = await api.getPlaybackToken(videoId)
        setSessionId(session.id)

        const video = videoRef.current
        if (!video) return

        // For unsigned playback, token is the stream UID itself
        // Use hardcoded customer code since VITE_ env vars are build-time only
        const streamUrl = `https://customer-f13bd0opbb08xh8b.cloudflarestream.com/${token}/manifest/video.m3u8`

        if (Hls.isSupported()) {
          const hls = new Hls()
          hlsRef.current = hls
          hls.loadSource(streamUrl)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false)
          })
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setError('فشل تحميل الفيديو')
            }
          })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = streamUrl
          video.addEventListener('loadedmetadata', () => setIsLoading(false))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ')
      }
    }

    if (watermarkCode) {
      initPlayer()
    }

    return () => {
      hlsRef.current?.destroy()
    }
  }, [videoId, streamUid, watermarkCode])

  // Track watch time
  const updateWatchTime = useCallback(async () => {
    if (!sessionId) return
    const currentTime = watchTimeRef.current
    if (currentTime - lastUpdateRef.current >= 5) {
      await api.updateWatchTime(sessionId, Math.floor(currentTime))
      lastUpdateRef.current = currentTime
    }
  }, [sessionId])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      watchTimeRef.current = video.currentTime
      updateWatchTime()
    }

    const handleEnded = async () => {
      if (sessionId) {
        await api.endSession(sessionId)
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
      if (sessionId) {
        api.endSession(sessionId)
      }
    }
  }, [sessionId, updateWatchTime])

  if (error) {
    return (
      <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  const toggleFullscreen = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    if (!containerRef.current) return
    
    try {
      if (!document.fullscreenElement) {
        // Try standard fullscreen first
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen()
        }
        // Fallback for iOS Safari
        else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen()
        }
        // Fallback for older iOS
        else if ((videoRef.current as any)?.webkitEnterFullscreen) {
          (videoRef.current as any).webkitEnterFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }

  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return
    
    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    
    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current
    if (!video) return
    
    video.volume = newVolume
    setVolume(newVolume)
    if (newVolume === 0) {
      setIsMuted(true)
    } else if (isMuted) {
      setIsMuted(false)
    }
  }

  const togglePiP = async () => {
    const video = videoRef.current
    if (!video || !isPiPSupported) return
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await video.requestPictureInPicture()
      }
    } catch (err) {
      console.error('PiP error:', err)
    }
  }

  const seekVideo = (seconds: number) => {
    const video = videoRef.current
    if (!video) return
    
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration))
  }

  // Touch gestures handler
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }
    setShowControls(true)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    const deltaTime = Date.now() - touchStartRef.current.time
    
    // Double tap to like (handled in WatchPage)
    const now = Date.now()
    if (now - lastTapRef.current < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      // Double tap detected - could trigger like
      const event = new CustomEvent('videoDoubleTap')
      window.dispatchEvent(event)
    }
    lastTapRef.current = now
    
    // Swipe gestures
    if (deltaTime < 500) {
      // Horizontal swipe - seek
      if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 30) {
        const seekAmount = deltaX > 0 ? 10 : -10
        seekVideo(seekAmount)
        if ('vibrate' in navigator) navigator.vibrate(10)
      }
      
      // Vertical swipe - volume
      if (Math.abs(deltaY) > 50 && Math.abs(deltaX) < 30) {
        const volumeChange = deltaY > 0 ? -0.1 : 0.1
        handleVolumeChange(Math.max(0, Math.min(1, volume + volumeChange)))
        if ('vibrate' in navigator) navigator.vibrate(10)
      }
    }
  }

  const handleContainerClick = () => {
    setShowControls(true)
  }

  return (
    <div 
      ref={containerRef} 
      className={`relative bg-black overflow-hidden ${isFullscreen ? 'w-screen h-screen' : 'aspect-video rounded-lg'}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleContainerClick}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-discord-primary border-t-transparent" />
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        controlsList="nodownload nofullscreen"
        onContextMenu={(e) => e.preventDefault()}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onVolumeChange={(e) => {
          const video = e.currentTarget
          setVolume(video.volume)
          setIsMuted(video.muted)
        }}
        preload="metadata"
      />

      {/* Custom Controls */}
      {showControls && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 z-20 transition-opacity duration-300">
          {/* Center Play/Pause */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              togglePlayPause()
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-all active:scale-95"
          >
            {isPlaying ? (
              <Pause size={32} className="text-white" fill="white" />
            ) : (
              <Play size={32} className="text-white ml-1" fill="white" />
            )}
          </button>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              className="p-2 hover:bg-white/20 rounded transition-colors active:scale-95"
            >
              {isPlaying ? (
                <Pause size={20} className="text-white" />
              ) : (
                <Play size={20} className="text-white" />
              )}
            </button>

            {/* Volume */}
            <button
              onClick={toggleMute}
              className="p-2 hover:bg-white/20 rounded transition-colors active:scale-95"
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={20} className="text-white" />
              ) : (
                <Volume2 size={20} className="text-white" />
              )}
            </button>

            <div className="flex-1" />

            {/* PiP */}
            {isPiPSupported && (
              <button
                onClick={togglePiP}
                className="p-2 hover:bg-white/20 rounded transition-colors active:scale-95"
                title="Picture in Picture"
              >
                <PictureInPicture size={20} className="text-white" />
              </button>
            )}

            {/* Fullscreen */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFullscreen(e)
              }}
              className="p-2 hover:bg-white/20 rounded transition-colors active:scale-95"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize size={20} className="text-white" />
              ) : (
                <Maximize size={20} className="text-white" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Dynamic Watermark - Always visible and secure */}
      <div
        className="absolute pointer-events-none select-none transition-all duration-1000 ease-in-out"
        style={{
          left: isFullscreen 
            ? `${5 + watermarkPosition.x * 0.85}%`
            : `${35 + watermarkPosition.x * 0.30}%`,
          top: `${5 + watermarkPosition.y * 0.85}%`,
          opacity: 0.5,
          fontSize: isFullscreen 
            ? (window.innerWidth > window.innerHeight ? '22px' : '20px')
            : '16px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
          zIndex: 9999,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      >
        {watermarkCode}
      </div>
    </div>
  )
}
