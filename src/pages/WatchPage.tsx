import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Video } from '../types'
import { api } from '../lib/api'
import { VideoPlayer } from '../components/VideoPlayer'
import { Layout } from '../components/Layout'
import { Comments } from '../components/Comments'
import { ArrowLeft, Loader, Trophy, Clock, Shield, TrendingUp, Calendar, Mic, User, ThumbsUp } from 'lucide-react'

export function WatchPage() {
  const { id } = useParams<{ id: string }>()
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
      case 'last_hit': return 'Last hit went overtime'
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
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Videos
        </Link>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <VideoPlayer videoId={video.id} streamUid={video.stream_uid} />
            
            {/* YouTube-style info bar below video */}
            <div className="mt-4">
              <h1 className="text-xl font-bold mb-3">{video.title}</h1>
              
              <div className="flex items-center justify-between flex-wrap gap-4">
                {/* Date */}
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{new Date(video.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}</span>
                </div>

                {/* Like Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLike}
                    disabled={isLiking}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                      video.user_liked 
                        ? 'bg-theme text-white' 
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    <ThumbsUp 
                      size={18} 
                      className={video.user_liked ? 'fill-current' : ''} 
                    />
                    <span className="font-medium">{formatNumber(video.likes_count || 0)}</span>
                  </button>
                </div>
              </div>

              {/* Uploader Info */}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-700">
                <div className="w-10 h-10 bg-theme rounded-full flex items-center justify-center">
                  <User size={20} />
                </div>
                <div>
                  <p className="font-medium">{video.uploader_name || 'Unknown'}</p>
                  <p className="text-sm text-gray-400">Uploader</p>
                </div>
              </div>

              {/* Description */}
              {video.description && (
                <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-gray-300 whitespace-pre-wrap">{video.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Video Info Sidebar */}
          <div className="space-y-6">

            {/* Game Stats */}
            {(video.season || video.day || video.wins_attacks || video.arena_time || 
              video.shield_hits || video.start_rank || video.end_rank || video.has_commentary ||
              (video.overtime_type && video.overtime_type !== 'none')) && (
              <div className="card">
                <h2 className="text-lg font-semibold mb-4 text-theme-light">Game Stats</h2>
                <div className="space-y-3">
                  {/* Season & Day */}
                  {(video.season || video.day) && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar size={18} className="text-blue-400" />
                      <span className="text-gray-400">
                        {video.season && <span className="text-white">{video.season}</span>}
                        {video.season && video.day && ' • '}
                        {video.day && <span className="text-white">{video.day}</span>}
                      </span>
                    </div>
                  )}

                  {/* Wins/Attacks */}
                  {video.wins_attacks && (
                    <div className="flex items-center gap-3 text-sm">
                      <Trophy size={18} className="text-yellow-400" />
                      <span className="text-gray-400">Wins/Attacks: <span className="text-white">{video.wins_attacks}</span></span>
                    </div>
                  )}

                  {/* Arena Time */}
                  {video.arena_time && (
                    <div className="flex items-center gap-3 text-sm">
                      <Clock size={18} className="text-green-400" />
                      <span className="text-gray-400">Arena Time: <span className="text-white">{video.arena_time}</span></span>
                    </div>
                  )}

                  {/* Shield Hits */}
                  {video.shield_hits && (
                    <div className="flex items-center gap-3 text-sm">
                      <Shield size={18} className="text-cyan-400" />
                      <span className="text-gray-400">Shield Hits: <span className="text-white">{video.shield_hits}</span></span>
                    </div>
                  )}

                  {/* Rank Progress */}
                  {(video.start_rank || video.end_rank) && (
                    <div className="flex items-center gap-3 text-sm">
                      <TrendingUp size={18} className="text-purple-400" />
                      <span className="text-gray-400">
                        Rank: 
                        {video.start_rank && <span className="text-white ml-1">{video.start_rank}</span>}
                        {video.start_rank && video.end_rank && <span className="text-gray-500 mx-1">→</span>}
                        {video.end_rank && <span className="text-green-400">{video.end_rank}</span>}
                      </span>
                    </div>
                  )}

                  {/* Overtime Status */}
                  {video.overtime_type && video.overtime_type !== 'none' && (
                    <div className="flex items-center gap-3 text-sm">
                      <Clock size={18} className="text-orange-400" />
                      <span className="text-orange-400">{getOvertimeLabel(video.overtime_type)}</span>
                    </div>
                  )}

                  {/* Commentary */}
                  {video.has_commentary && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mic size={18} className="text-pink-400" />
                      <span className="text-pink-400">Has Commentary</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Comments Section - Full Width Below Video */}
        <div className="mt-8">
          <div className="card">
            <Comments videoId={video.id} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
