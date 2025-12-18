import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { api } from '../../lib/api'
import { Users, Video, Eye, ThumbsUp, Clock, Calendar, TrendingUp, Play, UserPlus, Loader } from 'lucide-react'

interface TopVideo {
  id: string
  title: string
  views: number
  likes: number
}

interface RecentSession {
  id: string
  discord_id: string
  started_at: string
  watch_seconds: number
  videos?: { title: string }
}

interface Stats {
  totalViews: number
  totalLikes: number
  totalMembers: number
  activeMembers: number
  totalVideos: number
  publishedVideos: number
  todayViews: number
  weekViews: number
  totalWatchTime: number
  topVideos: TopVideo[]
  newMembersThisMonth: number
  recentSessions: RecentSession[]
  periodViews?: number
  periodWatchTime?: number
  periodSessions?: number
}

type TimePeriod = 'today' | 'week' | 'month' | '3months' | '6months' | 'year' | 'all' | 'custom'

const TIME_PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: '3months', label: 'Last 3 Months' },
  { value: '6months', label: 'Last 6 Months' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
]

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showCustomDates, setShowCustomDates] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [selectedPeriod, customStartDate, customEndDate])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      let startDate: string | undefined
      let endDate: string | undefined
      
      const now = new Date()
      
      switch (selectedPeriod) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString()
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
          break
        case '3months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString()
          break
        case '6months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString()
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1).toISOString()
          break
        case 'custom':
          if (customStartDate) startDate = new Date(customStartDate).toISOString()
          if (customEndDate) endDate = new Date(customEndDate).toISOString()
          break
        case 'all':
        default:
          break
      }
      
      const data = await api.getStats(startDate, endDate)
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period)
    setShowCustomDates(period === 'custom')
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-400">Platform overview and analytics</p>
        </div>
        
        {/* Time Period Filter */}
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value as TimePeriod)}
            className="input-field px-4 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg focus:border-discord-primary focus:outline-none"
          >
            {TIME_PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Custom Date Range */}
      {showCustomDates && (
        <div className="card mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">From:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="input-field px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">To:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="input-field px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="animate-spin text-theme-light" size={48} />
        </div>
      ) : (
        <>
          {/* Period Stats */}
          {selectedPeriod !== 'all' && (
            <div className="card mb-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={18} className="text-theme-light" />
                <h3 className="font-semibold">
                  {TIME_PERIODS.find(p => p.value === selectedPeriod)?.label} Stats
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-theme-light">{stats?.periodViews || 0}</p>
                  <p className="text-xs text-gray-400">Views</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-theme-light">{stats?.periodSessions || 0}</p>
                  <p className="text-xs text-gray-400">Sessions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-theme-light">{formatDuration(stats?.periodWatchTime || 0)}</p>
                  <p className="text-xs text-gray-400">Watch Time</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Views</p>
                  <p className="text-3xl font-bold mt-1 text-blue-400">{stats?.totalViews?.toLocaleString() || 0}</p>
                </div>
                <Eye size={36} className="text-blue-400" />
              </div>
            </div>
            <div className="card bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Likes</p>
                  <p className="text-3xl font-bold mt-1 text-pink-400">{stats?.totalLikes?.toLocaleString() || 0}</p>
                </div>
                <ThumbsUp size={36} className="text-pink-400" />
              </div>
            </div>
            <div className="card bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Members</p>
                  <p className="text-3xl font-bold mt-1 text-green-400">{stats?.activeMembers?.toLocaleString() || 0}</p>
                  <p className="text-xs text-gray-500">of {stats?.totalMembers || 0} total</p>
                </div>
                <Users size={36} className="text-green-400" />
              </div>
            </div>
            <div className="card bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Videos</p>
                  <p className="text-3xl font-bold mt-1 text-purple-400">{stats?.publishedVideos || 0}</p>
                  <p className="text-xs text-gray-500">of {stats?.totalVideos || 0} total</p>
                </div>
                <Video size={36} className="text-purple-400" />
              </div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Calendar size={20} className="text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.todayViews || 0}</p>
                  <p className="text-xs text-gray-400">Views Today</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <TrendingUp size={20} className="text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.weekViews || 0}</p>
                  <p className="text-xs text-gray-400">Views This Week</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Clock size={20} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatDuration(stats?.totalWatchTime || 0)}</p>
                  <p className="text-xs text-gray-400">Total Watch Time</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <UserPlus size={20} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.newMembersThisMonth || 0}</p>
                  <p className="text-xs text-gray-400">New This Month</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Videos */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="text-theme-light" size={20} />
                Top Videos
              </h2>
              {stats?.topVideos && stats.topVideos.length > 0 ? (
                <div className="space-y-3">
                  {stats.topVideos.map((video, index) => (
                    <div key={video.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-theme/20 flex items-center justify-center text-sm font-bold text-theme-light">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={`/watch/${video.id}`}
                          className="font-medium truncate block hover:text-theme-light transition-colors"
                        >
                          {video.title}
                        </Link>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Eye size={12} /> {video.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp size={12} /> {video.likes}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">No videos yet</p>
              )}
            </div>

            {/* Recent Activity */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Play className="text-theme-light" size={20} />
                Recent Views
              </h2>
              {stats?.recentSessions && stats.recentSessions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 text-right">
                        <th className="py-2 px-3 text-gray-400 font-medium">Member</th>
                        <th className="py-2 px-3 text-gray-400 font-medium">Video</th>
                        <th className="py-2 px-3 text-gray-400 font-medium">Duration</th>
                        <th className="py-2 px-3 text-gray-400 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentSessions.map((session) => (
                        <tr key={session.id} className="border-b border-gray-700/50 hover:bg-gray-800/30 text-right">
                          <td className="py-2 px-3">
                            <Link 
                              to={`/admin/members/${session.discord_id}`}
                              className="flex items-center justify-end gap-2 hover:text-theme-light transition-colors"
                            >
                              <span className="truncate max-w-[100px]">
                                {(session as any).member_name || session.discord_id.slice(0, 8) + '...'}
                              </span>
                              <div className="w-6 h-6 rounded-full bg-theme/20 flex items-center justify-center flex-shrink-0">
                                <Users size={12} className="text-theme-light" />
                              </div>
                            </Link>
                          </td>
                          <td className="py-2 px-3">
                            <Link 
                              to={`/watch/${(session as any).video_id}`}
                              className="text-gray-300 hover:text-theme-light transition-colors truncate block"
                            >
                              {(session as any).videos?.title || 'Unknown'}
                            </Link>
                          </td>
                          <td className="py-2 px-3 text-gray-400">
                            {formatDuration(session.watch_seconds)}
                          </td>
                          <td className="py-2 px-3 text-gray-500 text-xs whitespace-nowrap">
                            {formatTimeAgo(session.started_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}
