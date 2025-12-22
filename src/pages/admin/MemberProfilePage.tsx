import { useEffect, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { Member, ViewSession } from '../../types'
import { ArrowLeft, Loader, User, Calendar, LogIn, Video, Clock, Eye, Play, TrendingUp, ChevronLeft, ChevronRight, Upload, ThumbsUp, CheckCircle, MoreHorizontal, X, Chrome, Monitor, Shield, MapPin, Globe } from 'lucide-react'

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

interface LoginLog {
  id: string
  discord_id: string
  ip_address: string
  country?: string
  city?: string
  user_agent?: string
  logged_in_at?: string
  logged_at?: string
}

interface MemberProfile extends Member {
  sessions: ViewSession[]
  total_watch_time: number
  videos_watched: number
  uploaded_videos?: UploadedVideo[]
  login_logs?: LoginLog[]
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export function MemberProfilePage() {
  const { discordId } = useParams<{ discordId: string }>()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<ViewSession | null>(null)
  const [selectedLoginLog, setSelectedLoginLog] = useState<LoginLog | null>(null)
  const [showAllVideos, setShowAllVideos] = useState(false)

  // Only admins can view member profiles
  const canViewProfile = user?.is_admin

  useEffect(() => {
    const fetchProfile = async () => {
      if (!discordId) return
      
      try {
        const data = await api.getMemberProfile(discordId)
        setProfile(data.profile)
      } catch (error) {
        console.error('Failed to fetch member profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [discordId])

  // Separate effect for fetching sessions and calculating stats
  useEffect(() => {
    const fetchSessions = async () => {
      if (!discordId || !profile) return
      
      try {
        const data = await api.getSessions()
        // Filter sessions for this member
        const memberSessions = data.sessions.filter(s => s.discord_id === discordId)
        
        // Calculate statistics from sessions
        const totalWatchTime = memberSessions.reduce((sum, s) => sum + (s.watch_seconds || 0), 0)
        const uniqueVideos = new Set(memberSessions.map(s => s.video_id)).size
        const avgWatchTime = memberSessions.length > 0 ? totalWatchTime / memberSessions.length : 0
        const firstWatch = memberSessions.length > 0 
          ? memberSessions.sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())[0].started_at
          : null
        
        setProfile(prev => prev ? {
          ...prev,
          sessions: memberSessions,
          total_watch_time: totalWatchTime,
          videos_watched: uniqueVideos,
          ...(prev as any).avg_watch_time !== undefined && { avg_watch_time: avgWatchTime },
          ...(prev as any).first_watch !== undefined && { first_watch: firstWatch }
        } : null)
      } catch (error) {
        console.error('Failed to fetch sessions:', error)
      }
    }

    if (profile && profile.sessions.length === 0) {
      fetchSessions()
    }
  }, [discordId, profile?.discord_id])

  // Separate effect for fetching login logs
  useEffect(() => {
    const fetchLoginLogs = async () => {
      if (!discordId || !profile) return
      
      try {
        const response = await fetch(`/.netlify/functions/admin-login-logs?discord_id=${discordId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setProfile(prev => prev ? {
            ...prev,
            login_logs: data.logs || []
          } : null)
        }
      } catch (error) {
        console.error('Failed to fetch login logs:', error)
      }
    }

    if (profile && (!profile.login_logs || profile.login_logs.length === 0)) {
      fetchLoginLogs()
    }
  }, [discordId, profile?.discord_id])

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
                <h1 className="text-2xl font-bold text-theme">{profile.discord_username || profile.discord_id}</h1>
              </div>
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

        {/* Uploaded Videos Section */}
        {profile.uploaded_videos && profile.uploaded_videos.length > 0 && (
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Upload size={20} className="text-green-400" />
                {t('uploadedVideos')}
                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full ml-2">
                  {profile.uploaded_videos.length}
                </span>
              </h2>
              {profile.uploaded_videos.length > 5 && (
                <button
                  onClick={() => setShowAllVideos(!showAllVideos)}
                  className="text-sm text-theme-light hover:text-theme transition-colors"
                >
                  {showAllVideos ? 'Show Less' : 'Show More'}
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(showAllVideos ? profile.uploaded_videos : profile.uploaded_videos.slice(0, 5)).map((video) => (
                <Link
                  key={video.id}
                  to={`/watch/${video.id}`}
                  className="group block bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl overflow-hidden border border-gray-700/50 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300"
                >
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
                    
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${
                      video.is_published 
                        ? 'bg-green-500/90 text-white' 
                        : 'bg-yellow-500/90 text-black'
                    }`}>
                      <CheckCircle size={12} />
                      {video.is_published ? 'Published' : 'Draft'}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-green-400 transition-colors">
                      {video.title}
                    </h3>
                    
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Eye size={12} />
                          {video.views_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp size={12} />
                          {video.likes_count || 0}
                        </span>
                      </div>
                      <span>{new Date(video.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Session History */}
        <div className="card mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Eye size={20} className="text-theme-light" />
              Session History
              <span className="bg-theme/20 text-theme-light text-xs px-2 py-0.5 rounded-full ml-2">
                {Math.min(10, profile.sessions?.length || 0)}
              </span>
            </h2>
            <span className="text-xs text-gray-400">Last 10 sessions</span>
          </div>
          
          {profile.sessions && profile.sessions.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">{t('video')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">{t('date')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">{t('duration')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">{t('location')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Device</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.sessions
                      .slice(0, 10)
                      .map((session) => (
                        <tr key={session.id} className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <Link 
                              to={`/admin/members/${profile.discord_id}`}
                              className="flex items-center gap-2 hover:text-theme-light transition-colors"
                            >
                              {profile.discord_avatar ? (
                                <img src={profile.discord_avatar} alt="" className="w-6 h-6 rounded-full" />
                              ) : (
                                <User size={20} />
                              )}
                              {profile.discord_username || profile.game_id}
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
                          <td className="py-3 px-4 text-gray-400 whitespace-nowrap text-sm">
                            {new Date(session.started_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-sm">
                            {formatDuration(session.watch_seconds)}
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-sm">
                            {session.ip_address === '::1' || session.ip_address === '127.0.0.1' || session.ip_address?.startsWith('1::')
                              ? 'Local'
                              : session.country || '-'}
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
                  .slice(0, 10)
                  .map((session) => (
                    <div key={session.id} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar size={14} />
                          {new Date(session.started_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          {session.user_agent?.toLowerCase().includes('mobile') ? (
                            <><Monitor size={12} /> Mobile</>
                          ) : (
                            <><Chrome size={12} /> Desktop</>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <span className="text-gray-400 text-xs block mb-1 flex items-center gap-1">
                            <MapPin size={12} />
                            {t('location')}:
                          </span>
                          <span className="text-gray-100 font-medium">
                            {session.ip_address === '::1' || session.ip_address === '127.0.0.1' || session.ip_address?.startsWith('1::')
                              ? 'Local'
                              : `${session.country || '-'}${session.city ? `, ${session.city}` : ''}`}
                          </span>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <span className="text-gray-400 text-xs block mb-1 flex items-center gap-1">
                            <Globe size={12} />
                            IP:
                          </span>
                          <span className="text-gray-100 font-mono text-xs">{session.ip_address}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-center py-8">No sessions recorded yet</p>
          )}
        </div>

        {/* Login Logs */}
        <div className="card mb-6 mt-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <LogIn className="text-blue-400" size={20} />
              Login Logs
              <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full ml-2">
                {Math.min(10, profile.login_logs?.length || 0)}
              </span>
            </h2>
            <span className="text-xs text-gray-400">Last 10 logins</span>
          </div>
          
          {profile.login_logs && profile.login_logs.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">{t('location')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">IP Address</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Device</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.login_logs
                      .slice(0, 10)
                      .map((log) => (
                        <tr key={log.id} className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors">
                          <td className="py-3 px-4 text-gray-400 whitespace-nowrap text-sm">
                            {log.logged_at ? new Date(log.logged_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Invalid Date'}
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-sm">
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-blue-400" />
                              {log.ip_address === '::1' || log.ip_address === '127.0.0.1' || log.ip_address?.startsWith('1::')
                                ? 'Local'
                                : `${log.country || '-'}${log.city ? `, ${log.city}` : ''}`}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-400 font-mono text-sm">
                            {log.ip_address}
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-sm">
                            <div className="flex items-center gap-2">
                              {log.user_agent?.toLowerCase().includes('mobile') ? (
                                <Monitor size={14} className="text-purple-400" />
                              ) : (
                                <Chrome size={14} className="text-cyan-400" />
                              )}
                              {log.user_agent?.toLowerCase().includes('mobile') ? 'Mobile' : 'Desktop'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setSelectedLoginLog(log)}
                              className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 transition-colors"
                              title="View Details"
                            >
                              <MoreHorizontal size={16} className="text-blue-400" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {profile.login_logs
                  .slice(0, 10)
                  .map((log) => (
                    <div key={log.id} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar size={14} />
                          {log.logged_at ? new Date(log.logged_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Invalid Date'}
                        </div>
                        <button
                          onClick={() => setSelectedLoginLog(log)}
                          className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 transition-colors"
                          title="View Details"
                        >
                          <MoreHorizontal size={12} className="text-blue-400" />
                        </button>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          {log.user_agent?.toLowerCase().includes('mobile') ? (
                            <><Monitor size={12} /> Mobile</>
                          ) : (
                            <><Chrome size={12} /> Desktop</>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <span className="text-gray-400 text-xs block mb-1 flex items-center gap-1">
                            <MapPin size={12} />
                            {t('location')}:
                          </span>
                          <span className="text-gray-100 font-medium">
                            {log.ip_address === '::1' || log.ip_address === '127.0.0.1' || log.ip_address?.startsWith('1::')
                              ? 'Local'
                              : `${log.country || '-'}${log.city ? `, ${log.city}` : ''}`}
                          </span>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <span className="text-gray-400 text-xs block mb-1 flex items-center gap-1">
                            <Globe size={12} />
                            IP:
                          </span>
                          <span className="text-gray-100 font-mono text-xs">{log.ip_address}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-center py-8">No login logs recorded yet</p>
          )}
        </div>

        {/* Session Details Modal */}
        {selectedSession && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedSession(null)}>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-theme to-theme-light p-6 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Eye size={24} />
                  Session Details
                </h3>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Video Information */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <Video size={16} />
                    Video Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Video:</span>
                      <Link 
                        to={`/watch/${selectedSession.video_id}`}
                        className="text-theme-light hover:underline font-medium"
                      >
                        {(selectedSession as any).videos?.title || 'Unknown Video'}
                      </Link>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Watermark Code:</span>
                      <span className="text-white font-mono text-sm">{selectedSession.watermark_code}</span>
                    </div>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <Calendar size={16} />
                    Date & Time
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Started:</span>
                      <span className="text-white font-medium">
                        {new Date(selectedSession.started_at).toLocaleString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                    {selectedSession.ended_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Ended:</span>
                        <span className="text-white font-medium">
                          {new Date(selectedSession.ended_at).toLocaleString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Watch Duration:</span>
                      <span className="text-white font-medium">{formatDuration(selectedSession.watch_seconds)}</span>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <MapPin size={16} />
                    Location
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Country:</span>
                      <span className="text-white font-medium">{selectedSession.country || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">City:</span>
                      <span className="text-white font-medium">{selectedSession.city || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">IP Address:</span>
                      <span className="text-white font-mono text-sm">{selectedSession.ip_address}</span>
                    </div>
                    {selectedSession.isp && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">ISP:</span>
                        <span className="text-white font-medium">{selectedSession.isp}</span>
                      </div>
                    )}
                    {selectedSession.is_vpn && (
                      <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
                        <Shield size={14} className="text-yellow-400" />
                        <span className="text-sm text-yellow-400">VPN Detected</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Device Info */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <Monitor size={16} />
                    Device Information
                  </h4>
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 text-sm">User Agent:</span>
                    <span className="text-white text-xs font-mono bg-gray-900/50 p-2 rounded break-all">
                      {selectedSession.user_agent || '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Login Log Details Modal */}
        {selectedLoginLog && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedLoginLog(null)}>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 p-6 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <LogIn size={24} />
                  Login Details
                </h3>
                <button
                  onClick={() => setSelectedLoginLog(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Date & Time */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <Calendar size={16} />
                    Date & Time
                  </h4>
                  <p className="text-lg font-semibold text-white">
                    {selectedLoginLog.logged_at ? new Date(selectedLoginLog.logged_at).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    }) : 'Invalid Date'}
                  </p>
                </div>

                {/* Location */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <MapPin size={16} />
                    Location
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Country:</span>
                      <span className="text-white font-medium">{selectedLoginLog.country || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">City:</span>
                      <span className="text-white font-medium">{selectedLoginLog.city || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">IP Address:</span>
                      <span className="text-white font-mono text-sm">{selectedLoginLog.ip_address}</span>
                    </div>
                  </div>
                </div>

                {/* Device Info */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <Monitor size={16} />
                    Device Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Device Type:</span>
                      <span className="text-white font-medium flex items-center gap-2">
                        {selectedLoginLog.user_agent?.toLowerCase().includes('mobile') ? (
                          <><Monitor size={14} /> Mobile</>
                        ) : (
                          <><Chrome size={14} /> Desktop</>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-400 text-sm">User Agent:</span>
                      <span className="text-white text-xs font-mono bg-gray-900/50 p-2 rounded break-all">
                        {selectedLoginLog.user_agent || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                {(selectedLoginLog as any).status && (
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Status</h4>
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                      (selectedLoginLog as any).status === 'success' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {(selectedLoginLog as any).status === 'success' ? 'Successful' : 'Failed'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
