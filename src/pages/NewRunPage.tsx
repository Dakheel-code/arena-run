import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Upload, Loader, ArrowLeft, Play } from 'lucide-react'
import * as tus from 'tus-js-client'

export function NewRunPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [uploadData, setUploadData] = useState({
    description: '',
    season: '',
    day: '',
    wins_attacks: '',
    arena_time: '',
    shield_hits: '',
    overtime_type: 'none',
    start_rank: '',
    end_rank: '',
    has_commentary: false,
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadStartTime = useRef<number>(0)
  const lastBytesUploaded = useRef<number>(0)
  const lastUpdateTime = useRef<number>(0)

  // Generate title automatically
  const generateTitle = () => {
    const playerName = user?.username || user?.game_id || 'Player'
    const season = uploadData.season ? `S${uploadData.season.replace(/[^0-9]/g, '')}` : ''
    const day = uploadData.day ? `DAY ${uploadData.day.replace(/[^0-9]/g, '')}` : ''
    
    const parts = [playerName]
    if (season) parts.push(season)
    if (day) parts.push(day)
    
    return parts.join(' - ')
  }

  const generatedTitle = generateTitle()

  const handleUpload = async () => {
    if (!selectedFile || !uploadData.season || !uploadData.day) return
    const file = selectedFile

    setIsUploading(true)
    setUploadProgress(0)
    setUploadSpeed(0)
    setTimeRemaining('')
    uploadStartTime.current = Date.now()
    lastBytesUploaded.current = 0
    lastUpdateTime.current = Date.now()

    try {
      const { uploadUrl } = await api.createVideo({
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

      // Upload to Cloudflare Stream using TUS
      const tusUpload = await uploadWithTus(file, uploadUrl, (progress) => {
        setUploadProgress(progress)
      })

      if (tusUpload) {
        alert('Video uploaded successfully! It will be processed and reviewed shortly.')
        navigate('/')
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload video')
    } finally {
      setIsUploading(false)
    }
  }

  const uploadWithTus = (
    file: File,
    uploadUrl: string,
    onProgress: (progress: number) => void
  ): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        uploadUrl: uploadUrl,
        chunkSize: 25 * 1024 * 1024, // 25MB chunks for faster upload
        retryDelays: [0, 1000, 3000, 5000, 10000],
        metadata: {
          filename: file.name,
          filetype: file.type,
        },
        onError: (error) => {
          console.error('Upload error:', error)
          reject(error)
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100)
          onProgress(percentage)
          
          // Calculate speed and time remaining
          const now = Date.now()
          const timeDiff = (now - lastUpdateTime.current) / 1000 // seconds
          if (timeDiff >= 0.5) { // Update every 0.5 seconds
            const bytesDiff = bytesUploaded - lastBytesUploaded.current
            const speed = bytesDiff / timeDiff // bytes per second
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

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Play size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">New Run</h1>
              <p className="text-gray-400 text-sm">Upload your arena run video</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Auto-generated Title Preview */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-4 text-center">
              <p className="text-xl font-bold text-theme-light">
                {generatedTitle || 'Enter Season & Day below'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Season *</label>
                <input
                  type="text"
                  value={uploadData.season}
                  onChange={(e) => setUploadData((d) => ({ ...d, season: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g. 157"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Day *</label>
                <input
                  type="text"
                  value={uploadData.day}
                  onChange={(e) => setUploadData((d) => ({ ...d, day: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g. 12"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Wins/Attacks</label>
                <input
                  type="text"
                  value={uploadData.wins_attacks}
                  onChange={(e) => setUploadData((d) => ({ ...d, wins_attacks: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g. 15/20"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Arena Time</label>
                <input
                  type="text"
                  value={uploadData.arena_time}
                  onChange={(e) => setUploadData((d) => ({ ...d, arena_time: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g. 45:30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Shield Hits</label>
              <input
                type="text"
                value={uploadData.shield_hits}
                onChange={(e) => setUploadData((d) => ({ ...d, shield_hits: e.target.value }))}
                className="input-field w-full"
                placeholder="Number of hits before shield"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Overtime Status</label>
              <select
                value={uploadData.overtime_type}
                onChange={(e) => setUploadData((d) => ({ ...d, overtime_type: e.target.value }))}
                className="input-field w-full"
              >
                <option value="none">None</option>
                <option value="last_hit">Last hit went overtime</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Start Rank</label>
                <input
                  type="text"
                  value={uploadData.start_rank}
                  onChange={(e) => setUploadData((d) => ({ ...d, start_rank: e.target.value }))}
                  className="input-field w-full"
                  placeholder="Starting rank"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">End Rank</label>
                <input
                  type="text"
                  value={uploadData.end_rank}
                  onChange={(e) => setUploadData((d) => ({ ...d, end_rank: e.target.value }))}
                  className="input-field w-full"
                  placeholder="Ending rank"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="has_commentary"
                checked={uploadData.has_commentary}
                onChange={(e) => setUploadData((d) => ({ ...d, has_commentary: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="has_commentary" className="text-sm text-gray-400">
                Video has commentary
              </label>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Description</label>
              <textarea
                value={uploadData.description}
                onChange={(e) => setUploadData((d) => ({ ...d, description: e.target.value }))}
                className="input-field w-full h-20 resize-none"
                placeholder="Enter video description (optional)"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Video File *</label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-green-500/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  id="video-file"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setSelectedFile(file)
                    }
                  }}
                />
                <label htmlFor="video-file" className="cursor-pointer">
                  <Upload size={32} className={`mx-auto mb-2 ${selectedFile ? 'text-theme-light' : 'text-gray-400'}`} />
                  <p className={selectedFile ? 'text-theme-light font-medium' : 'text-gray-400'}>
                    {selectedFile ? selectedFile.name : 'Click to select video file'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedFile 
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                      : 'MP4, MOV, AVI up to 10GB'
                    }
                  </p>
                </label>
              </div>
            </div>

            {isUploading && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-theme-light">Uploading...</span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>
                    {uploadSpeed > 0 ? (
                      uploadSpeed > 1024 * 1024 
                        ? `${(uploadSpeed / (1024 * 1024)).toFixed(1)} MB/s`
                        : `${(uploadSpeed / 1024).toFixed(0)} KB/s`
                    ) : 'Calculating...'}
                  </span>
                  <span>{timeRemaining ? `~${timeRemaining} remaining` : ''}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={isUploading || !uploadData.season || !uploadData.day || !selectedFile}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
            >
              {isUploading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Uploading...
                </>
              ) : (
                <>
                  <Play size={20} />
                  Start Run
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
