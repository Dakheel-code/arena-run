import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Video } from '../types'
import { api } from '../lib/api'
import { VideoPlayer } from '../components/VideoPlayer'
import { Layout } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { ArrowLeft, Loader, Trophy, Clock, Shield, TrendingUp, Calendar, Mic, User, ThumbsUp, Edit2 } from 'lucide-react'

export function WatchPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [video, setVideo] = useState<Video | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLiking, setIsLiking] = useState(false)

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return
      try {
        const { video } = await api.getVideo(id)
        setVideo(video)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video')
      } finally {
        setIsLoading(false)
      }
    }
    fetchVideo()
  }, [id])

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader className="animate-spin text-theme-light" size={48} />
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const handleLike = async () => {
    if (!video || isLiking) return
    setIsLiking(true)
    try {
      const result = await api.likeVideo(video.id)
      setVideo(prev => prev ? {
        ...prev,
        user_liked: result.liked,
        likes_count: result.likes_count
      } : null)
    } catch (error) {
      console.error('Failed to like video:', error)
    } finally {
      setIsLiking(false)
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
              {/* Like Button */}
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full transition-all active:scale-95 ${
                  video.user_liked 
                    ? 'bg-theme text-white shadow-lg shadow-theme/30' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                <ThumbsUp 
                  size={16} 
                  className={video.user_liked ? 'fill-current' : ''} 
                />
                <span className="text-sm font-medium hidden sm:inline">{formatNumber(video.likes_count || 0)}</span>
                <span className="text-sm font-medium sm:hidden">{(video.likes_count || 0) > 999 ? formatNumber(video.likes_count || 0) : video.likes_count || 0}</span>
              </button>

              
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

      </div>
    </Layout>
  )
}
