import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { api } from '../lib/api'

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
  const watchTimeRef = useRef(0)
  const lastUpdateRef = useRef(0)

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

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

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div 
      ref={containerRef} 
      className={`relative bg-black overflow-hidden ${isFullscreen ? 'w-screen h-screen' : 'aspect-video rounded-lg'}`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-discord-primary border-t-transparent" />
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        playsInline
        controlsList="nodownload nofullscreen"
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Custom Fullscreen Button */}
      <button
        onClick={toggleFullscreen}
        className="absolute bottom-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded transition-colors z-20"
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        )}
      </button>

      {/* Dynamic Watermark - constrained to portrait video area (center 35% of width) */}
      <div
        className="absolute pointer-events-none select-none transition-all duration-1000 ease-in-out"
        style={{
          // Portrait video takes ~35% of container width, centered
          // So valid range is roughly 32.5% to 67.5% horizontally
          left: `${35 + watermarkPosition.x * 0.30}%`,
          top: `${5 + watermarkPosition.y * 0.85}%`,
          opacity: 0.4,
          fontSize: isFullscreen ? '18px' : '14px',
          fontFamily: 'monospace',
          color: 'white',
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
          zIndex: 30,
        }}
      >
        {watermarkCode}
      </div>
    </div>
  )
}
