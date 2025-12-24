import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { api } from '../../lib/api'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { Video, Member } from '../../types'
import { Plus, Trash2, Eye, EyeOff, Loader, Upload, X, Edit, Video as VideoIcon, User } from 'lucide-react'
import { VideoPlayer } from '../../components/VideoPlayer'
import * as tus from 'tus-js-client'

function getThumbnailUrl(streamUid: string): string {
  return `https://customer-f13bd0opbb08xh8b.cloudflarestream.com/${streamUid}/thumbnails/thumbnail.jpg?time=10s&width=320`
}

export function VideosPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { user } = useAuth()
  const [videos, setVideos] = useState<Video[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [uploadData, setUploadData] = useState({
    title: '',
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
  const [watchingVideo, setWatchingVideo] = useState<Video | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchVideos()
    fetchMembers()
  }, [])

  const fetchVideos = async () => {
    try {
      const { videos } = await api.getVideos()
      setVideos(videos)
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMembers = async () => {
    try {
      const { members } = await api.getMembers()
      setMembers(members)
    } catch (error) {
      console.error('Failed to fetch members:', error)
    }
  }

  // Generate title automatically like NewRunPage
  const generateTitle = () => {
    const uploaderName = user?.username || user?.game_id || 'Admin'
    const season = uploadData.season ? `S${uploadData.season.replace(/[^0-9]/g, '')}` : ''
    const day = uploadData.day ? `DAY ${uploadData.day.replace(/[^0-9]/g, '')}` : ''
    
    const parts = [uploaderName]
    if (season) parts.push(season)
    if (day) parts.push(day)
    
    return parts.join(' - ')
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file || !uploadData.season || !uploadData.day) return

    const generatedTitle = generateTitle()

    setIsUploading(true)
    setUploadProgress(0)

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
        alert('Video uploaded successfully! It will be processed shortly.')
        setShowUploadModal(false)
        setUploadData({
          title: '',
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
        fetchVideos()
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
        },
        onSuccess: () => {
          console.log('Upload completed successfully')
          resolve(true)
        },
      })

      upload.start()
    })
  }

  const togglePublish = async (video: Video) => {
    console.log('Toggling publish for video:', video.id, 'Current state:', video.is_published)
    try {
      const result = await api.publishVideo(video.id, !video.is_published)
      console.log('Publish result:', result)
      setVideos((prev) =>
        prev.map((v) => (v.id === video.id ? { ...v, is_published: !v.is_published } : v))
      )
    } catch (error) {
      console.error('Failed to toggle publish:', error)
      alert('Failed to update video status')
    }
  }

  const deleteVideo = async (video: Video) => {
    if (!confirm(`Are you sure you want to delete "${video.title}"?`)) return

    try {
      await api.deleteVideo(video.id)
      setVideos((prev) => prev.filter((v) => v.id !== video.id))
    } catch (error) {
      console.error('Failed to delete video:', error)
    }
  }

  const handleEditSave = async () => {
    if (!editingVideo) return
    
    try {
      const updateData = {
        ...uploadData,
        uploaded_by: editingVideo.uploaded_by,
        uploader_name: editingVideo.uploader_name,
      }
      await api.updateVideo(editingVideo.id, updateData)
      setVideos((prev) =>
        prev.map((v) => (v.id === editingVideo.id ? { ...v, ...updateData } : v))
      )
      setEditingVideo(null)
      setUploadData({
        title: '',
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
      alert('Video updated successfully!')
    } catch (error) {
      console.error('Failed to update video:', error)
      alert('Failed to update video')
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1 md:mb-2">
            <VideoIcon className="w-6 h-6 md:w-8 md:h-8 text-theme" />
            <h1 className="text-2xl md:text-3xl font-bold text-theme">{t('manageVideosTitle')}</h1>
          </div>
          <p className="text-sm md:text-base text-gray-400">{t('uploadAndManage')}</p>
        </div>
        <button onClick={() => navigate('/new-run')} className="btn-discord text-sm md:text-base px-3 py-2 md:px-6 md:py-3">
          <Plus size={16} className="md:w-5 md:h-5" />
          <span className="hidden sm:inline">{t('newRun')}</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="animate-spin text-theme-light" size={48} />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <div key={video.id} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl overflow-hidden border border-gray-700/50 transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-lg animate-fade-in-up">
              {/* Thumbnail */}
              <div 
                className="relative aspect-video bg-gray-800 cursor-pointer group"
                onClick={() => setWatchingVideo(video)}
              >
                {video.stream_uid ? (
                  <img
                    src={getThumbnailUrl(video.stream_uid)}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <Upload size={48} />
                  </div>
                )}
                
                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-theme/90 rounded-full p-4">
                    <VideoIcon size={32} className="text-white" />
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className={`absolute top-2 right-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                  video.is_published
                    ? 'bg-green-500/90 text-white'
                    : 'bg-yellow-500/90 text-black'
                }`}>
                  {video.is_published ? t('published') : t('draft')}
                </div>
              </div>

              {/* Content */}
              <div className="p-2.5">
                <h3 className="font-semibold text-sm mb-1 line-clamp-2">{video.title}</h3>
                <p className="text-xs text-gray-400 mb-1.5 line-clamp-1">{video.description || t('noDescription')}</p>
                
                {/* Uploader */}
                {video.uploader_name && (
                  <div className="flex items-center gap-1.5 mb-2">
                    {video.uploader_avatar ? (
                      <img 
                        src={video.uploader_avatar.startsWith('http') 
                          ? video.uploader_avatar 
                          : `https://cdn.discordapp.com/avatars/${video.uploaded_by}/${video.uploader_avatar}.png`
                        }
                        alt={video.uploader_name}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-theme/20 flex items-center justify-center">
                        <User size={10} className="text-theme-light" />
                      </div>
                    )}
                    <span className="text-[10px] text-gray-400 truncate">{video.uploader_name}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2 pb-2 border-b border-gray-700/50">
                  <span className="text-[10px]">{new Date(video.created_at).toLocaleDateString('en-US')}</span>
                  {video.season && video.day && (
                    <span className="bg-theme/20 text-theme-light px-1.5 py-0.5 rounded text-[10px]">
                      S{video.season} • D{video.day}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => {
                      setEditingVideo(video)
                      setUploadData({
                        title: video.title || '',
                        description: video.description || '',
                        season: video.season || '',
                        day: video.day || '',
                        wins_attacks: video.wins_attacks || '',
                        arena_time: video.arena_time || '',
                        shield_hits: video.shield_hits || '',
                        overtime_type: video.overtime_type || 'none',
                        start_rank: video.start_rank || '',
                        end_rank: video.end_rank || '',
                        has_commentary: video.has_commentary || false,
                      })
                    }}
                    className="flex items-center justify-center gap-2 p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
                  >
                    <Edit size={18} />
                    <span className="text-sm">{t('edit')}</span>
                  </button>

                  <button
                    onClick={() => togglePublish(video)}
                    className="flex items-center justify-center gap-2 p-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {video.is_published ? <EyeOff size={18} /> : <Eye size={18} />}
                    <span className="text-sm">{video.is_published ? t('hide') : t('show')}</span>
                  </button>

                  <button
                    onClick={() => deleteVideo(video)}
                    className="flex items-center justify-center gap-2 p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                    <span className="text-sm">{t('delete')}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {videos.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              {t('noVideosStart')}
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {/* Edit Modal */}
      {editingVideo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t('editVideo')}</h2>
              <button
                onClick={() => {
                  setEditingVideo(null)
                  setUploadData({
                    title: '',
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
                }}
                className="p-2 hover:bg-gray-700 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('uploader')}</label>
                <input
                  type="text"
                  list="members-list"
                  value={editingVideo?.uploader_name || ''}
                  onChange={(e) => {
                    const searchValue = e.target.value.toLowerCase()
                    const selectedMember = members.find(m => 
                      m.discord_username?.toLowerCase() === searchValue.toLowerCase() ||
                      m.game_id?.toLowerCase() === searchValue.toLowerCase() ||
                      m.discord_id === searchValue
                    )
                    
                    if (selectedMember) {
                      setEditingVideo(prev => prev ? {
                        ...prev,
                        uploaded_by: selectedMember.discord_id,
                        uploader_name: selectedMember.discord_username || selectedMember.game_id || ''
                      } : null)
                    } else {
                      setEditingVideo(prev => prev ? {
                        ...prev,
                        uploader_name: e.target.value
                      } : null)
                    }
                  }}
                  className="input-field w-full"
                  placeholder="Search by name or Discord ID..."
                />
                <datalist id="members-list">
                  {members.map((member) => (
                    <option key={member.discord_id} value={member.discord_username || member.game_id}>
                      {member.discord_id}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('seasonLabel')}</label>
                  <input
                    type="text"
                    value={uploadData.season}
                    onChange={(e) => setUploadData((d) => ({ ...d, season: e.target.value }))}
                    className="input-field w-full"
                    placeholder="e.g. 5"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('dayLabel')}</label>
                  <input
                    type="text"
                    value={uploadData.day}
                    onChange={(e) => setUploadData((d) => ({ ...d, day: e.target.value }))}
                    className="input-field w-full"
                    placeholder="e.g. 3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('winsAttacks')}</label>
                  <input
                    type="text"
                    value={uploadData.wins_attacks}
                    onChange={(e) => setUploadData((d) => ({ ...d, wins_attacks: e.target.value }))}
                    className="input-field w-full"
                    placeholder="e.g. 15/20"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('arenaTime')}</label>
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
                <label className="block text-sm text-gray-400 mb-2">{t('shieldHits')}</label>
                <input
                  type="text"
                  value={uploadData.shield_hits}
                  onChange={(e) => setUploadData((d) => ({ ...d, shield_hits: e.target.value }))}
                  className="input-field w-full"
                  placeholder={t('shieldHitsPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('overtimeStatus')}</label>
                <select
                  value={uploadData.overtime_type}
                  onChange={(e) => setUploadData((d) => ({ ...d, overtime_type: e.target.value }))}
                  className="input-field w-full"
                >
                  <option value="none">{t('none')}</option>
                  <option value="last_hit">{t('lastHitOvertime')}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('startRank')}</label>
                  <input
                    type="text"
                    value={uploadData.start_rank}
                    onChange={(e) => setUploadData((d) => ({ ...d, start_rank: e.target.value }))}
                    className="input-field w-full"
                    placeholder={t('startingRank')}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('endRank')}</label>
                  <input
                    type="text"
                    value={uploadData.end_rank}
                    onChange={(e) => setUploadData((d) => ({ ...d, end_rank: e.target.value }))}
                    className="input-field w-full"
                    placeholder={t('endingRank')}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_has_commentary"
                  checked={uploadData.has_commentary}
                  onChange={(e) => setUploadData((d) => ({ ...d, has_commentary: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="edit_has_commentary" className="text-sm text-gray-400">
                  {t('videoHasCommentary')}
                </label>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('description')}</label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData((d) => ({ ...d, description: e.target.value }))}
                  className="input-field w-full h-20 resize-none"
                  placeholder={t('descriptionPlaceholder')}
                />
              </div>

              <button
                onClick={handleEditSave}
                className="btn-discord w-full"
              >
                {t('saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">New Run</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-700 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Auto-generated title preview */}
              {uploadData.season && uploadData.day && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                  <label className="block text-xs text-gray-500 mb-1">Generated Title</label>
                  <p className="text-sm font-medium text-theme-light">{generateTitle()}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('seasonLabel')}</label>
                  <input
                    type="text"
                    value={uploadData.season}
                    onChange={(e) => setUploadData((d) => ({ ...d, season: e.target.value }))}
                    className="input-field w-full"
                    placeholder="e.g. Season 5"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('dayLabel')}</label>
                  <input
                    type="text"
                    value={uploadData.day}
                    onChange={(e) => setUploadData((d) => ({ ...d, day: e.target.value }))}
                    className="input-field w-full"
                    placeholder="e.g. Day 3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('winsAttacks')}</label>
                  <input
                    type="text"
                    value={uploadData.wins_attacks}
                    onChange={(e) => setUploadData((d) => ({ ...d, wins_attacks: e.target.value }))}
                    className="input-field w-full"
                    placeholder="e.g. 15/20"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('arenaTime')}</label>
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
                <label className="block text-sm text-gray-400 mb-2">{t('shieldHits')}</label>
                <input
                  type="text"
                  value={uploadData.shield_hits}
                  onChange={(e) => setUploadData((d) => ({ ...d, shield_hits: e.target.value }))}
                  className="input-field w-full"
                  placeholder={t('shieldHitsPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('overtimeStatus')}</label>
                <select
                  value={uploadData.overtime_type}
                  onChange={(e) => setUploadData((d) => ({ ...d, overtime_type: e.target.value }))}
                  className="input-field w-full"
                >
                  <option value="none">{t('none')}</option>
                  <option value="last_hit">{t('lastHitOvertime')}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('startRank')}</label>
                  <input
                    type="text"
                    value={uploadData.start_rank}
                    onChange={(e) => setUploadData((d) => ({ ...d, start_rank: e.target.value }))}
                    className="input-field w-full"
                    placeholder={t('startingRank')}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('endRank')}</label>
                  <input
                    type="text"
                    value={uploadData.end_rank}
                    onChange={(e) => setUploadData((d) => ({ ...d, end_rank: e.target.value }))}
                    className="input-field w-full"
                    placeholder={t('endingRank')}
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
                  {t('videoHasCommentary')}
                </label>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('description')}</label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData((d) => ({ ...d, description: e.target.value }))}
                  className="input-field w-full h-20 resize-none"
                  placeholder={t('descriptionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('videoFile')} *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="input-field w-full"
                />
              </div>

              {isUploading && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t('uploading')}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-discord-primary transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={isUploading || !uploadData.season || !uploadData.day}
                className="btn-discord w-full"
              >
                {isUploading ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  <Upload size={20} />
                )}
                {isUploading ? t('uploading') : t('newRun')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
