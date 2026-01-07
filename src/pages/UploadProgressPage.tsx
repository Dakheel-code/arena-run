import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AlertTriangle, Upload } from 'lucide-react'
import * as tus from 'tus-js-client'

type UploadData = {
  description: string
  season: string
  day: string
  wins_attacks: string
  arena_time: string
  shield_hits: string
  overtime_type: string
  start_rank: string
  end_rank: string
  has_commentary: boolean
}

type UploadProgressState = {
  uploadData: UploadData
  file: File
  displayName?: string
}

export function UploadProgressPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { t } = useLanguage()

  const state = (location.state as UploadProgressState | null) ?? null

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState('')
  const [error, setError] = useState<string | null>(null)

  const startedRef = useRef(false)
  const lastBytesUploaded = useRef<number>(0)
  const lastUpdateTime = useRef<number>(0)

  const generatedTitle = useMemo(() => {
    if (!state) return ''
    const playerName = state.displayName || user?.username || user?.game_id || 'Player'
    const season = state.uploadData.season ? `S${state.uploadData.season.replace(/[^0-9]/g, '')}` : ''
    const day = state.uploadData.day ? `DAY ${state.uploadData.day.replace(/[^0-9]/g, '')}` : ''

    const parts = [playerName]
    if (season) parts.push(season)
    if (day) parts.push(day)

    return parts.join(' - ')
  }, [state, user?.game_id, user?.username])

  useEffect(() => {
    if (!isUploading) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isUploading])

  const uploadWithTus = (
    file: File,
    uploadUrl: string,
    onProgress: (progress: number) => void
  ): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        uploadUrl: uploadUrl,
        chunkSize: 25 * 1024 * 1024,
        retryDelays: [0, 1000, 3000, 5000, 10000],
        metadata: {
          filename: file.name,
          filetype: file.type,
        },
        onError: (error) => {
          reject(error)
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100)
          onProgress(percentage)

          const now = Date.now()
          const timeDiff = (now - lastUpdateTime.current) / 1000
          if (timeDiff >= 0.5) {
            const bytesDiff = bytesUploaded - lastBytesUploaded.current
            const speed = bytesDiff / timeDiff
            setUploadSpeed(speed)

            const remainingBytes = bytesTotal - bytesUploaded
            const remainingSeconds = speed > 0 ? remainingBytes / speed : 0

            if (remainingSeconds < 60) {
              setTimeRemaining(`${Math.round(remainingSeconds)}s`)
            } else if (remainingSeconds < 3600) {
              setTimeRemaining(`${Math.round(remainingSeconds / 60)}m`)
            } else {
              setTimeRemaining(`${Math.round(remainingSeconds / 3600)}h`)
            }

            lastBytesUploaded.current = bytesUploaded
            lastUpdateTime.current = now
          }
        },
        onSuccess: () => {
          resolve(true)
        },
      })

      upload.start()
    })
  }

  useEffect(() => {
    const startUpload = async () => {
      if (!state || startedRef.current) return
      startedRef.current = true

      const { uploadData, file } = state

      if (!file || !uploadData.season || !uploadData.day) {
        setError('Missing upload data. Please go back and try again.')
        return
      }

      setIsUploading(true)
      setUploadProgress(0)
      setUploadSpeed(0)
      setTimeRemaining('')
      setError(null)
      lastBytesUploaded.current = 0
      lastUpdateTime.current = Date.now()

      try {
        const { uploadUrl, video } = await api.createVideo({
          title: generatedTitle,
          description: uploadData.description,
          season: uploadData.season,
          day: uploadData.day,
          wins_attacks: uploadData.wins_attacks,
          arena_time: uploadData.arena_time,
          shield_hits: uploadData.shield_hits,
          overtime_type: uploadData.overtime_type,
          start_rank: uploadData.start_rank,
          end_rank: uploadData.end_rank,
          has_commentary: uploadData.has_commentary,
          fileSize: file.size,
        })

        const tusUpload = await uploadWithTus(file, uploadUrl, (progress) => {
          setUploadProgress(progress)
        })

        if (tusUpload) {
          try {
            await api.uploadComplete(video.id)
          } catch {
            // ignore
          }

          setTimeout(async () => {
            try {
              await api.updateSingleVideoDuration(video.id)
            } catch {
              // ignore
            }
          }, 5000)

          navigate('/upload-success')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
        startedRef.current = false
      } finally {
        setIsUploading(false)
      }
    }

    startUpload()
  }, [generatedTitle, navigate, state])

  if (!state) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-yellow-400" />
              <h1 className="text-xl font-bold">Upload session not found</h1>
            </div>
            <p className="text-gray-400 mb-6">Please start your upload from the New Run page.</p>
            <button onClick={() => navigate('/new-run')} className="btn-discord">
              Go to New Run
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  const speedLabel =
    uploadSpeed > 0
      ? uploadSpeed > 1024 * 1024
        ? `${(uploadSpeed / (1024 * 1024)).toFixed(1)} MB/s`
        : `${(uploadSpeed / 1024).toFixed(0)} KB/s`
      : 'Calculating...'

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Upload size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Uploading</h1>
              <p className="text-gray-400 text-sm">{generatedTitle}</p>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-200 font-semibold">Do not leave this page until the upload completes.</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-theme-light">{isUploading ? 'Uploading...' : 'Waiting...'}</span>
              <span className="font-mono">{uploadProgress}%</span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{speedLabel}</span>
              <span>{timeRemaining ? `~${timeRemaining} remaining` : ''}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          <div className="text-sm text-gray-400 mb-6">
            <div className="flex justify-between">
              <span>File</span>
              <span className="text-gray-200 truncate max-w-[60%]">{state.file.name}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span>{t('seasonLabel')}</span>
              <span className="text-gray-200">{state.uploadData.season}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span>{t('dayLabel')}</span>
              <span className="text-gray-200">{state.uploadData.day}</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/new-run')}
            disabled={isUploading}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
          >
            {isUploading ? (
              <>
                <LoadingSpinner size={20} />
                Uploading...
              </>
            ) : (
              'Back'
            )}
          </button>
        </div>
      </div>
    </Layout>
  )
}
