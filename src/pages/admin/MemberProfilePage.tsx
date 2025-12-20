import { useEffect, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { Member, ViewSession } from '../../types'
import { ArrowLeft, Loader, User, Calendar, LogIn, Video, Clock, Eye, Play, TrendingUp, ChevronLeft, ChevronRight, Upload, ThumbsUp, CheckCircle, MoreHorizontal, X, Chrome, Monitor, Shield } from 'lucide-react'

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
  const { user } = useAuth()
  const { t } = useLanguage()
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSessionPage, setCurrentSessionPage] = useState(1)
  const [sessionsPerPage, setSessionsPerPage] = useState(10)
  const [selectedSession, setSelectedSession] = useState<ViewSession | null>(null)

  // Only admins can view member profiles
  const canViewProfile = user?.is_admin

  useEffect(() => {
    const fetchProfile = async () => {
      if (!discordId || !canViewProfile) return
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
  }, [discordId, canViewProfile])

  // Redirect if user doesn't have permission to view this profile
  if (!canViewProfile) {
    return <Navigate to="/" replace />
  }

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
          <Link to="/" className="text-theme-light hover:underline">
            {t('backToHome')}
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
          {t('backToMembers')}
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
              <div className="flex items-center gap-3 mb-1">
                <User className="w-6 h-6 text-theme" />
                <h1 className="text-2xl font-bold text-theme">{profile.discord_username || profile.game_id}</h1>
              </div>
              <p className="text-gray-400">{t('gameId')}: {profile.game_id}</p>
              <p className="text-sm text-gray-500 font-mono">{profile.discord_id}</p>
              {profile.last_login && (
                <p className="text-xs text-gray-500 mt-1">
                  {t('lastLogin')}: {new Date(profile.last_login).toLocaleString('en-US', {
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
              {profile.is_active ? t('active') : t('inactive')}
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
            <p className="text-sm text-gray-400">{t('lastLogin')}</p>
          </div>
          <div className="card text-center">
            <Clock className="mx-auto mb-2 text-green-400" size={24} />
            <p className="text-2xl font-bold">{formatDuration(profile.total_watch_time || 0)}</p>
            <p className="text-sm text-gray-400">{t('watchTime')}</p>
          </div>
          <div className="card text-center">
            <Video className="mx-auto mb-2 text-purple-400" size={24} />
            <p className="text-2xl font-bold">{profile.videos_watched || 0}</p>
            <p className="text-sm text-gray-400">{t('videosWatched')}</p>
          </div>
          <div className="card text-center">
            <LogIn className="mx-auto mb-2 text-blue-400" size={24} />
            <p className="text-2xl font-bold">{profile.login_count || 0}</p>
            <p className="text-sm text-gray-400">{t('totalLogins')}</p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card text-center">
            <Play className="mx-auto mb-2 text-pink-400" size={24} />
            <p className="text-2xl font-bold">{(profile as any).total_views || 0}</p>
            <p className="text-sm text-gray-400">{t('totalViews')}</p>
          </div>
          <div className="card text-center">
            <TrendingUp className="mx-auto mb-2 text-cyan-400" size={24} />
            <p className="text-2xl font-bold">{formatDuration((profile as any).avg_watch_time || 0)}</p>
            <p className="text-sm text-gray-400">{t('avgWatchTime')}</p>
          </div>
          <div className="card text-center">
            <Eye className="mx-auto mb-2 text-orange-400" size={24} />
            <p className="text-2xl font-bold">
              {(profile as any).first_watch 
                ? new Date((profile as any).first_watch).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '-'}
            </p>
            <p className="text-sm text-gray-400">{t('firstWatch')}</p>
          </div>
          <div className="card text-center">
            <User className="mx-auto mb-2 text-gray-400" size={24} />
            <p className="text-2xl font-bold">
              {profile.created_at 
                ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '-'}
            </p>
            <p className="text-sm text-gray-400">{t('memberSince')}</p>
          </div>
        </div>

        {/* Uploaded Videos */}
        {profile.uploaded_videos && profile.uploaded_videos.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Upload size={20} className="text-green-400" />
              {t('uploadedVideos')}
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
                        src={video.thumbnail_url || `https://customer-f13bd0opbb08xh8b.cloudflarestream.com/${video.stream_uid}/thumbnails/thumbnail.jpg?time=10s&width=400`}
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
                          {t('published')}
                        </>
                      ) : (
                        <>
                          <Clock size={12} />
                          {t('unpublished')}
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
            {t('sessionHistory')}
          </h2>
          
          {profile.sessions && profile.sessions.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Member</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">video</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Country</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Duration</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Started</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">More</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.sessions
                      .slice((currentSessionPage - 1) * sessionsPerPage, currentSessionPage * sessionsPerPage)
                      .map((session) => (
                        <tr key={session.id} className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <Link 
                              to={`/admin/members/${profile.discord_id}`}
                              className="flex items-center gap-2 hover:text-theme-light transition-colors"
                            >
                              {profile.discord_avatar ? (
                                <img 
                                  src={profile.discord_avatar} 
                                  alt="Avatar"
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-theme/20 flex items-center justify-center">
                                  <User size={12} className="text-theme-light" />
                                </div>
                              )}
                              <span className="text-theme-light text-sm">
                                {profile.discord_username || profile.game_id}
                              </span>
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <Link 
                              to={`/watch/${session.video_id}`}
                              className="text-theme-light hover:underline transition-colors truncate block max-w-[180px] text-sm"
                            >
                              {(session as any).videos?.title || 'Unknown'}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-sm">
                            {session.ip_address === '::1' || session.ip_address === '127.0.0.1' || session.ip_address?.startsWith('1::')
                              ? 'Local'
                              : session.country || '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-sm">
                            {formatDuration(session.watch_seconds)}
                          </td>
                          <td className="py-3 px-4 text-gray-400 whitespace-nowrap text-sm">
                            {new Date(session.started_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setSelectedSession(session)}
                              className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors mx-auto block"
                              title="View Details"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {profile.sessions
                  .slice((currentSessionPage - 1) * sessionsPerPage, currentSessionPage * sessionsPerPage)
                  .map((session) => (
                    <div key={session.id} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 mb-1">
                            {new Date(session.started_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedSession(session)}
                          className="p-2 rounded-lg bg-theme/10 hover:bg-theme/20 text-theme-light transition-colors"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </div>

                      <Link 
                        to={`/watch/${session.video_id}`}
                        className="block mb-4 pb-4 border-b border-gray-700/50"
                      >
                        <div className="text-sm font-medium text-gray-200 hover:text-theme-light transition-colors">
                          {(session as any).videos?.title || 'Unknown'}
                        </div>
                      </Link>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <span className="text-gray-400 text-xs block mb-1">{t('country')}:</span>
                          <span className="text-gray-100 font-medium">
                            {session.ip_address === '::1' || session.ip_address === '127.0.0.1' || session.ip_address?.startsWith('1::')
                              ? 'Local'
                              : (
                                <>
                                  {session.country || '-'}
                                  {(session as any).city && `, ${(session as any).city}`}
                                </>
                              )}
                          </span>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <span className="text-gray-400 text-xs block mb-1">{t('duration')}:</span>
                          <span className="text-gray-100 font-medium">{formatDuration(session.watch_seconds)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Session Details Modal */}
              {selectedSession && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedSession(null)}>
                  <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Eye className="text-theme-light" size={24} />
                        Session Details
                      </h3>
                      <button
                        onClick={() => setSelectedSession(null)}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      {/* Video & Member */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-400 mb-2">video</p>
                          <Link 
                            to={`/watch/${selectedSession.video_id}`}
                            className="text-theme-light hover:underline font-medium"
                          >
                            {(selectedSession as any).videos?.title || 'Unknown'}
                          </Link>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-2">Member</p>
                          <Link 
                            to={`/admin/members/${profile.discord_id}`}
                            className="flex items-center gap-2 text-theme-light hover:underline"
                          >
                            {profile.discord_avatar ? (
                              <img src={profile.discord_avatar} alt="" className="w-8 h-8 rounded-full" />
                            ) : (
                              <User size={20} />
                            )}
                            {profile.discord_username || profile.game_id}
                          </Link>
                        </div>
                      </div>

                      {/* Started & Duration */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <p className="text-sm text-gray-400 mb-2">Started At</p>
                          <p className="text-white font-medium">
                            {new Date(selectedSession.started_at).toLocaleString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <p className="text-sm text-gray-400 mb-2">Watch Duration</p>
                          <p className="text-green-400 font-medium text-lg">{formatDuration(selectedSession.watch_seconds)}</p>
                        </div>
                      </div>

                      {/* IP & Location */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <p className="text-sm text-gray-400 mb-2">IP Address</p>
                          <p className="text-white font-mono text-sm">
                            {selectedSession.ip_address === '::1' || selectedSession.ip_address === '127.0.0.1'
                              ? 'Local'
                              : selectedSession.ip_address || '-'}
                          </p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <p className="text-sm text-gray-400 mb-2">Location</p>
                          <p className="text-white">
                            {selectedSession.country || '-'}
                            {(selectedSession as any).city && ` - ${(selectedSession as any).city}`}
                          </p>
                        </div>
                      </div>

                      {/* Device Information */}
                      <div className="bg-gray-800/30 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                          <Monitor size={16} />
                          Device Information
                        </p>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Browser</p>
                            <p className="text-white flex items-center gap-1">
                              <Chrome size={14} />
                              {selectedSession.user_agent?.includes('Chrome') ? 'Chrome' :
                               selectedSession.user_agent?.includes('Firefox') ? 'Firefox' :
                               selectedSession.user_agent?.includes('Safari') ? 'Safari' : 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Operating System</p>
                            <p className="text-white">
                              {selectedSession.user_agent?.includes('Windows') ? 'Windows 10/11' :
                               selectedSession.user_agent?.includes('Mac') ? 'macOS' :
                               selectedSession.user_agent?.includes('Linux') ? 'Linux' : 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Device Type</p>
                            <p className="text-white">Desktop</p>
                          </div>
                        </div>
                      </div>

                      {/* ISP & VPN */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <p className="text-sm text-gray-400 mb-2">ISP</p>
                          <p className="text-white">{(selectedSession as any).isp || '-'}</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                            <Shield size={14} />
                            VPN / Proxy
                          </p>
                          <p className={`font-medium ${(selectedSession as any).is_vpn ? 'text-red-400' : 'text-green-400'}`}>
                            {(selectedSession as any).is_vpn ? '⚠️ Detected' : 'Not Detected ✓'}
                          </p>
                        </div>
                      </div>

                      {/* Watermark */}
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-2">Watermark Code</p>
                        <p className="text-theme-light font-mono text-lg">{selectedSession.watermark_code || '-'}</p>
                      </div>

                      {/* Raw User Agent */}
                      <div className="bg-gray-800/30 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-2">Raw User Agent</p>
                        <p className="text-gray-300 text-xs break-all font-mono">
                          {selectedSession.user_agent || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">{t('show')}:</span>
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
                  <span className="text-sm text-gray-400">{t('perPage')}</span>
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
