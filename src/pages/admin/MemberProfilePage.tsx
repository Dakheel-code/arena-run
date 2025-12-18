import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { api } from '../../lib/api'
import { Member, ViewSession } from '../../types'
import { ArrowLeft, Loader, User, Calendar, LogIn, Video, Clock, Eye, Play, TrendingUp, ChevronLeft, ChevronRight, Upload, ThumbsUp, CheckCircle } from 'lucide-react'

interface UploadedVideo {
  id: string
  title: string
  thumbnail_url?: string
  stream_uid: string
  duration?: number
  views_count: number
  likes_count: number
  is_published: boolean
  created_at: string
}

interface MemberProfile extends Member {
  sessions: ViewSession[]
  total_watch_time: number
  videos_watched: number
  uploaded_videos?: UploadedVideo[]
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export function MemberProfilePage() {
  const { discordId } = useParams<{ discordId: string }>()
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionsPerPage, setSessionsPerPage] = useState(10)
  const [currentSessionPage, setCurrentSessionPage] = useState(1)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!discordId) return
      try {
        const data = await api.getMemberProfile(discordId)
        setProfile(data.profile)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [discordId])

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader className="animate-spin text-theme-light" size={48} />
        </div>
      </Layout>
    )
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error || 'Member not found'}</p>
          <Link to="/admin/members" className="text-theme-light hover:underline">
            Back to Members
          </Link>
        </div>
      </Layout>
    )
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  return (
    <Layout>
      <div className="mb-6">
        <Link
          to="/admin/members"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Members
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="card mb-6">
          <div className="flex items-center gap-6">
            {profile.discord_avatar ? (
              <img 
                src={profile.discord_avatar} 
                alt={profile.discord_username || 'Avatar'}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-theme rounded-full flex items-center justify-center">
                <User size={40} />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{profile.discord_username || profile.game_id}</h1>
              <p className="text-gray-400">Game ID: {profile.game_id}</p>
              <p className="text-sm text-gray-500 font-mono">{profile.discord_id}</p>
              {profile.last_login && (
                <p className="text-xs text-gray-500 mt-1">
                  Last login: {new Date(profile.last_login).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
            <div className={`px-3 py-1 rounded-full text-sm ${
              profile.is_active 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {profile.is_active ? 'Active' : 'Disabled'}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card text-center">
            <Calendar className="mx-auto mb-2 text-yellow-400" size={24} />
            <p className="text-2xl font-bold">
              {profile.last_login 
                ? new Date(profile.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'Never'}
            </p>
            <p className="text-sm text-gray-400">Last Login</p>
          </div>
          <div className="card text-center">
            <Clock className="mx-auto mb-2 text-green-400" size={24} />
            <p className="text-2xl font-bold">{formatDuration(profile.total_watch_time || 0)}</p>
            <p className="text-sm text-gray-400">Watch Time</p>
          </div>
          <div className="card text-center">
            <Video className="mx-auto mb-2 text-purple-400" size={24} />
            <p className="text-2xl font-bold">{profile.videos_watched || 0}</p>
            <p className="text-sm text-gray-400">Videos Watched</p>
          </div>
          <div className="card text-center">
            <LogIn className="mx-auto mb-2 text-blue-400" size={24} />
            <p className="text-2xl font-bold">{profile.login_count || 0}</p>
            <p className="text-sm text-gray-400">Total Logins</p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card text-center">
            <Play className="mx-auto mb-2 text-pink-400" size={24} />
            <p className="text-2xl font-bold">{(profile as any).total_views || 0}</p>
            <p className="text-sm text-gray-400">Total Views</p>
          </div>
          <div className="card text-center">
            <TrendingUp className="mx-auto mb-2 text-cyan-400" size={24} />
            <p className="text-2xl font-bold">{formatDuration((profile as any).avg_watch_time || 0)}</p>
            <p className="text-sm text-gray-400">Avg Watch Time</p>
          </div>
          <div className="card text-center">
            <Eye className="mx-auto mb-2 text-orange-400" size={24} />
            <p className="text-2xl font-bold">
              {(profile as any).first_watch 
                ? new Date((profile as any).first_watch).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '-'}
            </p>
            <p className="text-sm text-gray-400">First Watch</p>
          </div>
          <div className="card text-center">
            <User className="mx-auto mb-2 text-gray-400" size={24} />
            <p className="text-2xl font-bold">
              {profile.created_at 
                ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '-'}
            </p>
            <p className="text-sm text-gray-400">Member Since</p>
          </div>
        </div>

        {/* Uploaded Videos */}
        {profile.uploaded_videos && profile.uploaded_videos.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Upload size={20} className="text-green-400" />
              Uploaded Videos
              <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full ml-2">
                {profile.uploaded_videos.length}
              </span>
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.uploaded_videos.map((video) => (
                <Link
                  key={video.id}
                  to={`/watch/${video.id}`}
                  className="group block bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl overflow-hidden border border-gray-700/50 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gray-800 overflow-hidden">
                    {video.thumbnail_url || video.stream_uid ? (
                      <img
                        src={video.thumbnail_url || `https://customer-${import.meta.env.VITE_CF_CUSTOMER_CODE}.cloudflarestream.com/${video.stream_uid}/thumbnails/thumbnail.jpg?time=10s&width=400`}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                        <Video size={32} className="text-gray-500" />
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${
                      video.is_published 
                        ? 'bg-green-500/90 text-white' 
                        : 'bg-yellow-500/90 text-black'
                    }`}>
                      {video.is_published ? (
                        <>
                          <CheckCircle size={12} />
                          Published
                        </>
                      ) : (
                        <>
                          <Clock size={12} />
                          Draft
                        </>
                      )}
                    </div>

                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-green-500/90 backdrop-blur-sm flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <Play size={24} className="text-white ml-1" fill="white" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm truncate mb-2 group-hover:text-green-400 transition-colors">
                      {video.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={12} className="text-blue-400" />
                        {video.likes_count || 0} likes
                      </span>
                      <span>
                        {new Date(video.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Session History */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Eye size={20} className="text-theme-light" />
            Session History
          </h2>
          
          {profile.sessions && profile.sessions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-right py-3 px-4">Video</th>
                      <th className="text-right py-3 px-4">Started</th>
                      <th className="text-right py-3 px-4">Duration</th>
                      <th className="text-right py-3 px-4">IP Address</th>
                      <th className="text-right py-3 px-4">Country</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.sessions
                      .slice((currentSessionPage - 1) * sessionsPerPage, currentSessionPage * sessionsPerPage)
                      .map((session) => (
                      <tr key={session.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 text-right">
                        <td className="py-3 px-4">
                          <Link 
                            to={`/watch/${session.video_id}`}
                            className="text-sm hover:text-theme-light transition-colors"
                          >
                            {(session as any).videos?.title || session.video_id.slice(0, 8) + '...'}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          {new Date(session.started_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {formatDuration(session.watch_seconds)}
                        </td>
                        <td className="py-3 px-4 text-sm font-mono text-gray-400">
                          {session.ip_address === '::1' || session.ip_address === '127.0.0.1' || session.ip_address?.startsWith('1::')
                            ? 'Local'
                            : session.ip_address || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          {session.ip_address === '::1' || session.ip_address === '127.0.0.1' || session.ip_address?.startsWith('1::')
                            ? 'Local'
                            : session.country || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Show:</span>
                  <select
                    value={sessionsPerPage}
                    onChange={(e) => {
                      setSessionsPerPage(Number(e.target.value))
                      setCurrentSessionPage(1)
                    }}
                    className="input-field px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded"
                  >
                    {PAGE_SIZE_OPTIONS.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-400">per page</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">
                    {(currentSessionPage - 1) * sessionsPerPage + 1}-{Math.min(currentSessionPage * sessionsPerPage, profile.sessions.length)} of {profile.sessions.length}
                  </span>
                  <button
                    onClick={() => setCurrentSessionPage(p => Math.max(1, p - 1))}
                    disabled={currentSessionPage === 1}
                    className="p-1.5 rounded bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentSessionPage(p => Math.min(Math.ceil(profile.sessions.length / sessionsPerPage), p + 1))}
                    disabled={currentSessionPage >= Math.ceil(profile.sessions.length / sessionsPerPage)}
                    className="p-1.5 rounded bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-center py-8">No sessions recorded yet</p>
          )}
        </div>

      </div>
    </Layout>
  )
}
