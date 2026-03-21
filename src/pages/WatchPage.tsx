import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Video } from '../types'
import { api } from '../lib/api'
import { VideoPlayer } from '../components/VideoPlayer'
import { Layout } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { ArrowLeft, Trophy, Clock, Shield, TrendingUp, Calendar, Mic, User, Edit2, Play, Layers } from 'lucide-react'
import { LoadingSpinner } from '../components/LoadingSpinner'

function getThumbnailUrl(streamUid: string): string {
  return `https://customer-f13bd0opbb08xh8b.cloudflarestream.com/${streamUid}/thumbnails/thumbnail.jpg?time=10s&width=320`
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function WatchPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [video, setVideo] = useState<Video | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allVideos, setAllVideos] = useState<Video[]>([])

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return
      try {
        const [{ video }, { videos }] = await Promise.all([
          api.getVideo(id),
          api.getVideos()
        ])
        setVideo(video)
        setAllVideos(videos.filter(v => v.is_published))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video')
      } finally {
        setIsLoading(false)
      }
    }
    fetchVideo()
  }, [id])

  const suggestedVideos = useMemo(() => {
    if (!video || allVideos.length === 0) return []
    // Sort by newest first, exclude current video
    return [...allVideos]
      .filter(v => v.id !== video.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)
  }, [video, allVideos])

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size={48} className="text-theme-light" />
        </div>
      </Layout>
    )
  }

  if (error || !video) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error || 'Video not found'}</p>
          <Link to="/" className="text-theme-light hover:underline">
            Back to Home
          </Link>
        </div>
      </Layout>
    )
  }

  const getOvertimeLabel = (type?: string) => {
    switch (type) {
      case 'last_hit': return t('lastHitOvertime')
      case 'previous_day': return 'From previous day'
      default: return null
    }
  }




  return (
    <Layout>
      <div className="mb-6 animate-fade-in">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          {t('backToVideos')}
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Video Player */}
        <div className="animate-scale-in">
          <VideoPlayer videoId={video.id} streamUid={video.stream_uid} />
        </div>
        
        {/* Video Info */}
        <div className="mt-4 animate-slide-in-bottom">
          <h1 className="text-xl font-bold mb-3">{video.title}</h1>
          
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Date */}
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>{new Date(video.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Edit Button - Only for owner or admin */}
              {(video.uploaded_by === user?.discord_id || user?.is_admin) && (
                <Link
                  to={`/edit-video/${video.id}`}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-all active:scale-95"
                >
                  <Edit2 size={16} />
                  <span className="text-sm font-medium hidden sm:inline">{t('edit')}</span>
                </Link>
              )}
            </div>
          </div>

          {/* Uploader Info */}
          <Link 
            to={video.uploaded_by ? `/admin/members/${video.uploaded_by}` : '#'}
            className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-700 hover:bg-gray-800/50 -mx-2 px-2 py-2 rounded-lg transition-colors"
          >
            {video.uploader_avatar ? (
              <img 
                src={video.uploader_avatar.startsWith('http') 
                  ? video.uploader_avatar 
                  : `https://cdn.discordapp.com/avatars/${video.uploaded_by}/${video.uploader_avatar}.png`
                }
                alt={video.uploader_name || 'Uploader'}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-theme rounded-full flex items-center justify-center">
                <User size={20} />
              </div>
            )}
            <div>
              <p className="font-medium hover:text-theme-light transition-colors">{video.uploader_name || 'Unknown'}</p>
              <p className="text-sm text-gray-400">{t('uploader')}</p>
            </div>
          </Link>

          {/* Description */}
          {video.description && (
            <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
              <p className="text-gray-300 whitespace-pre-wrap">{video.description}</p>
            </div>
          )}
        </div>

        {/* Game Stats - Below Video */}
        {(video.season || video.day || video.wins_attacks || video.arena_time || 
          video.shield_hits || video.start_rank || video.end_rank || video.has_commentary ||
          (video.overtime_type && video.overtime_type !== 'none')) && (
          <div className="card mt-6">
            <h2 className="text-lg font-semibold mb-4 text-theme-light">{t('gameStats')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {/* Season & Day */}
              {(video.season || video.day) && (
                <div className="flex items-center gap-3 text-sm bg-gray-800/50 p-3 rounded-lg">
                  <Calendar size={18} className="text-blue-400" />
                  <span className="text-white">
                    {video.season}{video.season && video.day && ' • '}{video.day}
                  </span>
                </div>
              )}

              {/* Wins/Attacks */}
              {video.wins_attacks && (
                <div className="flex items-center gap-3 text-sm bg-gray-800/50 p-3 rounded-lg">
                  <Trophy size={18} className="text-yellow-400" />
                  <span className="text-white">{video.wins_attacks}</span>
                </div>
              )}

              {/* Arena Time */}
              {video.arena_time && (
                <div className="flex items-center gap-3 text-sm bg-gray-800/50 p-3 rounded-lg">
                  <Clock size={18} className="text-green-400" />
                  <span className="text-white">{video.arena_time}</span>
                </div>
              )}

              {/* Shield Hits */}
              {video.shield_hits && (
                <div className="flex items-center gap-3 text-sm bg-gray-800/50 p-3 rounded-lg">
                  <Shield size={18} className="text-cyan-400" />
                  <span className="text-white">{video.shield_hits} {t('hits')}</span>
                </div>
              )}

              {/* Rank Progress */}
              {(video.start_rank || video.end_rank) && (
                <div className="flex items-center gap-3 text-sm bg-gray-800/50 p-3 rounded-lg">
                  <TrendingUp size={18} className="text-purple-400" />
                  <span className="text-white">
                    {video.start_rank}
                    {video.start_rank && video.end_rank && <span className="text-gray-500 mx-1">→</span>}
                    {video.end_rank && <span className="text-green-400">{video.end_rank}</span>}
                  </span>
                </div>
              )}

              {/* Overtime Status */}
              {video.overtime_type && video.overtime_type !== 'none' && (
                <div className="flex items-center gap-3 text-sm bg-orange-500/10 p-3 rounded-lg">
                  <Clock size={18} className="text-orange-400" />
                  <span className="text-orange-400">{getOvertimeLabel(video.overtime_type)}</span>
                </div>
              )}

              {/* Commentary */}
              {video.has_commentary && (
                <div className="flex items-center gap-3 text-sm bg-pink-500/10 p-3 rounded-lg">
                  <Mic size={18} className="text-pink-400" />
                  <span className="text-pink-400">Commentary</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Latest Published Videos */}
        {suggestedVideos.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Layers size={20} className="text-theme" />
              <h2 className="text-lg font-bold">{t('latestVideos')}</h2>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded ml-1">
                {suggestedVideos.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {suggestedVideos.map((v) => {
                const thumb = v.thumbnail_url || (v.stream_uid ? getThumbnailUrl(v.stream_uid) : null)
                const isSameSeason = v.season && v.season === video.season
                return (
                  <Link
                    key={v.id}
                    to={`/watch/${v.id}`}
                    className="group flex flex-col bg-gray-800/60 border border-gray-700/50 hover:border-theme/50 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-theme/10 hover:-translate-y-0.5 active:scale-95"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-gray-900 overflow-hidden">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={v.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play size={32} className="text-gray-600" />
                        </div>
                      )}
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-theme/90 flex items-center justify-center">
                          <Play size={18} className="text-white ml-0.5" fill="white" />
                        </div>
                      </div>
                      {/* Duration */}
                      {typeof v.duration === 'number' && v.duration > 0 && (
                        <div className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                          <Clock size={10} />
                          {formatDuration(v.duration)}
                        </div>
                      )}
                      {/* Season badge */}
                      {(v.season || v.day) && (
                        <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-xs font-bold ${isSameSeason ? 'bg-theme/90' : 'bg-gray-700/90'}`}>
                          {v.season && `S${v.season}`}{v.season && v.day && '•'}{v.day && `D${v.day}`}
                        </div>
                      )}
                      {/* Same season indicator */}
                      {isSameSeason && (
                        <div className="absolute top-1.5 right-1.5 bg-theme/80 rounded-full w-2 h-2" title="نفس الموسم" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-2.5 flex flex-col gap-1">
                      <h3 className="text-xs sm:text-sm font-semibold line-clamp-2 leading-snug group-hover:text-theme-light transition-colors">
                        {v.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-auto">
                        {v.uploader_avatar ? (
                          <img
                            src={v.uploader_avatar.startsWith('http') ? v.uploader_avatar : `https://cdn.discordapp.com/avatars/${v.uploaded_by}/${v.uploader_avatar}.png`}
                            alt={v.uploader_name || ''}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-theme/20 flex items-center justify-center">
                            <User size={8} className="text-theme-light" />
                          </div>
                        )}
                        <span className="text-[10px] text-gray-400 truncate">{v.uploader_name || 'Unknown'}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
