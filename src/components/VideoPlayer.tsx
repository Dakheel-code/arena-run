import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { api } from '../lib/api'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, PictureInPicture, RotateCcw, RotateCw } from 'lucide-react'
import { useWatchHistory } from '../hooks/useWatchHistory'

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
  const { saveProgress, getProgress, clearProgress } = useWatchHistory(videoId)
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
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const watchTimeRef = useRef(0)
  const lastUpdateRef = useRef(0)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTapRef = useRef(0)
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })
  const sessionLoggedRef = useRef(false)
  const creatingSessionRef = useRef(false)
  const [_isHoveringPlayer, setIsHoveringPlayer] = useState(false)
  const [seekPreview, setSeekPreview] = useState<{ visible: boolean; time: number; x: number }>({ visible: false, time: 0, x: 0 })
  const [seekFeedback, setSeekFeedback] = useState<{ visible: boolean; direction: 'forward' | 'backward' } | null>(null)
  const seekFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const [previewFrame, setPreviewFrame] = useState<string>('')
  const previewSeekTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const playbackSpeeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4]

  // Simple session logging
  useEffect(() => {
    const logSession = () => {
      if (sessionLoggedRef.current) return
      if (currentTime < 10) return
      
      sessionLoggedRef.current = true
      const userStr = localStorage.getItem('user')
      if (!userStr) return
      
      try {
        const user = JSON.parse(userStr)
        fetch('/.netlify/functions/simple-log-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_id: videoId,
            discord_id: user.discord_id,
            watch_seconds: Math.floor(currentTime)
          })
        }).catch(e => console.log('Log failed:', e))
      } catch (e) {
        console.log('Parse error:', e)
      }
    }

    if (currentTime > 10 && !sessionLoggedRef.current) {
      logSession()
    }
  }, [currentTime, videoId])

  // Check PiP support
  useEffect(() => {
    setIsPiPSupported('pictureInPictureEnabled' in document)
  }, [])

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = !!document.fullscreenElement
      setIsFullscreen(isFS)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
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

  // Auto-hide controls (desktop: hide after 3s of no mouse movement when playing)
  const resetControlsTimer = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    setShowControls(true)
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!seekPreview.visible) setShowControls(false)
      }, 3000)
    }
  }, [isPlaying, seekPreview.visible])

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true)
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [isPlaying])

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
        const { token } = await api.getPlaybackToken(videoId)

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
    const currentTime = watchTimeRef.current
    // Send update at 3 seconds to count view, then every 5 seconds
    const shouldUpdate = 
      (currentTime >= 3 && lastUpdateRef.current < 3) || 
      (currentTime - lastUpdateRef.current >= 5)
    
    if (shouldUpdate) {
      if (!sessionId && creatingSessionRef.current) {
        return
      }

      const payload = sessionId
        ? { sessionId, watchSeconds: Math.floor(currentTime) }
        : {
            sessionId: null,
            watchSeconds: Math.floor(currentTime),
            videoId,
            watermarkCode,
          }

      if (!sessionId) {
        creatingSessionRef.current = true
      }

      const res = await api.updateWatchTime(payload)
      if (!sessionId && res.sessionId) {
        setSessionId(res.sessionId)
      }

      if (!sessionId) {
        creatingSessionRef.current = false
      }

      lastUpdateRef.current = currentTime
    }
  }, [sessionId, videoId, watermarkCode])

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
      // Clear watch history when video ends
      clearProgress()
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

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current
    if (!video) return
    
    video.playbackRate = speed
    setPlaybackRate(speed)
    setShowSpeedMenu(false)
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

    // Show seek feedback animation
    if (seekFeedbackTimeoutRef.current) clearTimeout(seekFeedbackTimeoutRef.current)
    setSeekFeedback({ visible: true, direction: seconds > 0 ? 'forward' : 'backward' })
    seekFeedbackTimeoutRef.current = setTimeout(() => setSeekFeedback(null), 600)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = progressBarRef.current
    const video = videoRef.current
    if (!progressBar || !video) return
    
    const rect = progressBar.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    video.currentTime = pos * video.duration
  }

  const captureFrameAtTime = useCallback((seekTime: number) => {
    const video = videoRef.current
    const canvas = previewCanvasRef.current
    if (!video || !canvas) return

    const savedTime = video.currentTime
    const savedPaused = video.paused

    const onSeeked = () => {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        canvas.width = 160
        canvas.height = 90
        ctx.drawImage(video, 0, 0, 160, 90)
        setPreviewFrame(canvas.toDataURL('image/jpeg', 0.6))
      }
      // Restore original position
      video.currentTime = savedTime
      if (!savedPaused) video.play()
      video.removeEventListener('seeked', onSeeked)
    }

    video.addEventListener('seeked', onSeeked)
    if (!savedPaused) video.pause()
    video.currentTime = seekTime
  }, [])

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = progressBarRef.current
    const video = videoRef.current
    if (!progressBar || !video || !duration) return

    const rect = progressBar.getBoundingClientRect()
    const pos = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1))
    const previewTime = pos * duration
    const xPos = e.clientX - rect.left

    setSeekPreview({ visible: true, time: previewTime, x: xPos })

    // Capture frame with debounce to avoid too many seeks
    if (previewSeekTimeoutRef.current) clearTimeout(previewSeekTimeoutRef.current)
    previewSeekTimeoutRef.current = setTimeout(() => {
      captureFrameAtTime(previewTime)
    }, 150)
  }

  const handleProgressMouseLeave = () => {
    setSeekPreview({ visible: false, time: 0, x: 0 })
    if (previewSeekTimeoutRef.current) clearTimeout(previewSeekTimeoutRef.current)
  }

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
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

  const handleContainerClick = (e: React.MouseEvent) => {
    // On desktop, click on the video area (not controls) toggles play/pause
    const target = e.target as HTMLElement
    const isControlButton = target.closest('button') || target.closest('input') || target.closest('.progress-bar-area')
    if (!isControlButton) {
      togglePlayPause()
    }
    resetControlsTimer()
  }

  const handleContainerMouseMove = () => {
    resetControlsTimer()
  }

  // Hidden canvas for frame capture
  // (no extra useEffect needed - canvas is in DOM)

  return (
    <div 
      ref={containerRef} 
      className={`relative bg-black overflow-hidden group/player ${isFullscreen ? 'w-screen h-screen' : 'aspect-video rounded-lg'}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleContainerClick}
      onMouseMove={handleContainerMouseMove}
      onMouseEnter={() => { setIsHoveringPlayer(true); resetControlsTimer() }}
      onMouseLeave={() => { setIsHoveringPlayer(false); if (isPlaying) setShowControls(false) }}
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
        onTimeUpdate={(e) => {
          const video = e.currentTarget
          setCurrentTime(video.currentTime)
          
          // Save progress periodically
          if (video.currentTime > 5 && video.duration) {
            saveProgress(video.currentTime, video.duration)
          }
        }}
        onLoadedMetadata={(e) => {
          const video = e.currentTarget
          setDuration(video.duration)
          
          // Resume from saved position
          const savedTime = getProgress()
          if (savedTime && savedTime > 5) {
            video.currentTime = savedTime
          }
        }}
        preload="metadata"
      />

      {/* Seek Feedback Animation */}
      {seekFeedback?.visible && (
        <div className={`absolute top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-1 ${
          seekFeedback.direction === 'forward' ? 'right-1/4' : 'left-1/4'
        }`} style={{ zIndex: 30 }}>
          <div className="bg-black/60 rounded-full p-3 animate-ping-once">
            {seekFeedback.direction === 'forward' ? (
              <RotateCw size={32} className="text-white" />
            ) : (
              <RotateCcw size={32} className="text-white" />
            )}
          </div>
          <span className="text-white text-sm font-bold drop-shadow-lg">
            {seekFeedback.direction === 'forward' ? '+10s' : '-10s'}
          </span>
        </div>
      )}

      {/* Custom Controls - visible on hover (desktop) or touch */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ 
          zIndex: 20,
          opacity: showControls || !isPlaying ? 1 : 0,
          pointerEvents: showControls || !isPlaying ? 'auto' : 'none'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

        {/* Center Controls Row: rewind, play/pause, forward */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-6">
          {/* Rewind 10s */}
          <button
            onClick={(e) => { e.stopPropagation(); seekVideo(-10) }}
            className="hidden sm:flex flex-col items-center gap-1 p-2 hover:bg-white/20 rounded-full transition-all active:scale-95 group"
            title="Rewind 10 seconds"
          >
            <RotateCcw size={28} className="text-white" />
            <span className="text-white text-xs font-bold">10</span>
          </button>

          {/* Play/Pause center */}
          <button
            onClick={(e) => { e.stopPropagation(); togglePlayPause() }}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-all active:scale-95"
          >
            {isPlaying ? (
              <Pause size={28} className="text-white" fill="white" />
            ) : (
              <Play size={28} className="text-white ml-1" fill="white" />
            )}
          </button>

          {/* Forward 10s */}
          <button
            onClick={(e) => { e.stopPropagation(); seekVideo(10) }}
            className="hidden sm:flex flex-col items-center gap-1 p-2 hover:bg-white/20 rounded-full transition-all active:scale-95"
            title="Forward 10 seconds"
          >
            <RotateCw size={28} className="text-white" />
            <span className="text-white text-xs font-bold">10</span>
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0">
          {/* Progress Bar with Thumbnail Preview */}
          <div className="px-3 sm:px-4 pb-1">
            {/* Hidden canvas for frame capture */}
            <canvas ref={previewCanvasRef} className="hidden" />

            {/* Thumbnail Preview Tooltip */}
            {seekPreview.visible && duration > 0 && (
              <div
                className="absolute bottom-16 pointer-events-none"
                style={{
                  left: Math.max(80, Math.min(seekPreview.x + 12, (progressBarRef.current?.offsetWidth ?? 300) - 80)),
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="bg-black rounded overflow-hidden shadow-xl border border-gray-700">
                  {previewFrame ? (
                    <img
                      src={previewFrame}
                      className="w-40 h-[90px] object-cover block"
                      alt="preview"
                    />
                  ) : (
                    <div className="w-40 h-[90px] bg-gray-900 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    </div>
                  )}
                  <div className="text-center text-white text-xs py-1 bg-black/90 font-medium">
                    {formatTime(seekPreview.time)}
                  </div>
                </div>
              </div>
            )}

            <div 
              ref={progressBarRef}
              onClick={handleProgressClick}
              onMouseMove={handleProgressMouseMove}
              onMouseLeave={handleProgressMouseLeave}
              className="relative h-1 bg-gray-600/80 rounded-full cursor-pointer hover:h-[5px] transition-all group/progress"
            >
              {/* Buffered */}
              <div className="absolute h-full bg-gray-400/40 rounded-full" style={{ width: '100%' }} />
              {/* Played */}
              <div 
                className="absolute h-full bg-red-500 rounded-full"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
              {/* Thumb */}
              <div 
                className="absolute top-1/2 w-3 h-3 bg-red-500 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow"
                style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%`, transform: 'translate(-50%, -50%)' }}
              />
              {/* Seek preview line */}
              {seekPreview.visible && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-white/50"
                  style={{ left: seekPreview.x }}
                />
              )}
            </div>
          </div>

          <div className="px-3 sm:px-4 pb-3 pt-1 flex items-center gap-1 sm:gap-2">
            {/* Play/Pause */}
            <button
              onClick={(e) => { e.stopPropagation(); togglePlayPause() }}
              className="p-1.5 hover:bg-white/20 rounded transition-colors active:scale-95"
            >
              {isPlaying ? (
                <Pause size={20} className="text-white" fill="white" />
              ) : (
                <Play size={20} className="text-white" fill="white" />
              )}
            </button>

            {/* Rewind 10s - bottom bar (mobile) */}
            <button
              onClick={(e) => { e.stopPropagation(); seekVideo(-10) }}
              className="sm:hidden p-1.5 hover:bg-white/20 rounded transition-colors active:scale-95"
            >
              <RotateCcw size={18} className="text-white" />
            </button>

            {/* Forward 10s - bottom bar (mobile) */}
            <button
              onClick={(e) => { e.stopPropagation(); seekVideo(10) }}
              className="sm:hidden p-1.5 hover:bg-white/20 rounded transition-colors active:scale-95"
            >
              <RotateCw size={18} className="text-white" />
            </button>

            {/* Volume */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleMute() }}
              className="p-1.5 hover:bg-white/20 rounded transition-colors active:scale-95"
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={20} className="text-white" />
              ) : (
                <Volume2 size={20} className="text-white" />
              )}
            </button>

            {/* Volume Slider - desktop only */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => { e.stopPropagation(); handleVolumeChange(Number(e.target.value)) }}
              className="hidden sm:block w-20 accent-white cursor-pointer"
              title="Volume"
            />

            {/* Time */}
            <span className="text-white text-xs sm:text-sm ml-1 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Playback Speed */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu) }}
                className="p-1.5 hover:bg-white/20 rounded transition-colors active:scale-95"
                title="Playback Speed"
              >
                <span className="text-xs font-bold text-white">{playbackRate}x</span>
              </button>
              
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg shadow-xl border border-gray-700 py-2 min-w-[80px]">
                  {playbackSpeeds.map((speed) => (
                    <button
                      key={speed}
                      onClick={(e) => { e.stopPropagation(); handleSpeedChange(speed) }}
                      className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-800 transition-colors ${
                        playbackRate === speed ? 'text-red-400 font-bold' : 'text-white'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PiP */}
            {isPiPSupported && (
              <button
                onClick={(e) => { e.stopPropagation(); togglePiP() }}
                className="p-1.5 hover:bg-white/20 rounded transition-colors active:scale-95"
                title="Picture in Picture"
              >
                <PictureInPicture size={18} className="text-white" />
              </button>
            )}

            {/* Fullscreen */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(e) }}
              className="p-1.5 hover:bg-white/20 rounded transition-colors active:scale-95"
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
      </div>

      {/* Enhanced Dynamic Watermark - Always visible and secure - MUST be after controls */}
      <div
        className="absolute pointer-events-none select-none transition-all duration-1000 ease-in-out"
        style={{
          // For portrait videos (9:16), video takes ~35% of container width, centered
          // So watermark should be constrained to 32.5% to 67.5% horizontally
          left: `${32.5 + watermarkPosition.x * 0.30}%`,
          top: `${5 + watermarkPosition.y * 0.85}%`,
          opacity: 0.6,
          fontSize: isFullscreen 
            ? (window.innerWidth > window.innerHeight ? '24px' : '22px')
            : '16px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          color: 'white',
          textShadow: '2px 2px 6px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,0.8)',
          zIndex: 99999,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        }}
      >
        {watermarkCode}
      </div>
    </div>
  )
}
