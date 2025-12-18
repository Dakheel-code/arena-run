import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { api } from '../../lib/api'
import { ViewSession } from '../../types'
import { Loader, Eye, ChevronLeft, ChevronRight, User, Clock, Globe, Monitor } from 'lucide-react'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

interface SessionWithDetails extends ViewSession {
  videos?: { title: string }
  member_name?: string
  member_avatar?: string
}

export function SessionsPage() {
  const [sessions, setSessions] = useState<SessionWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [sessionsPerPage, setSessionsPerPage] = useState(25)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const data = await api.getSessions()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins < 60) return `${mins}m ${secs}s`
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hours}h ${remainingMins}m`
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Pagination
  const totalPages = Math.ceil(sessions.length / sessionsPerPage)
  const startIndex = (currentPage - 1) * sessionsPerPage
  const endIndex = startIndex + sessionsPerPage
  const paginatedSessions = sessions.slice(startIndex, endIndex)

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader className="animate-spin text-theme-light" size={48} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Sessions Log</h1>
        <p className="text-gray-400">Detailed activity log of all view sessions</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <Eye className="mx-auto mb-2 text-theme-light" size={24} />
          <p className="text-2xl font-bold">{sessions.length}</p>
          <p className="text-sm text-gray-400">Total Sessions</p>
        </div>
        <div className="card text-center">
          <Clock className="mx-auto mb-2 text-green-400" size={24} />
          <p className="text-2xl font-bold">
            {formatDuration(sessions.reduce((sum, s) => sum + (s.watch_seconds || 0), 0))}
          </p>
          <p className="text-sm text-gray-400">Total Watch Time</p>
        </div>
        <div className="card text-center">
          <User className="mx-auto mb-2 text-purple-400" size={24} />
          <p className="text-2xl font-bold">{new Set(sessions.map(s => s.discord_id)).size}</p>
          <p className="text-sm text-gray-400">Unique Viewers</p>
        </div>
        <div className="card text-center">
          <Globe className="mx-auto mb-2 text-blue-400" size={24} />
          <p className="text-2xl font-bold">{new Set(sessions.map(s => s.country).filter(Boolean)).size}</p>
          <p className="text-sm text-gray-400">Countries</p>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Monitor className="text-theme-light" size={20} />
            All Sessions
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Show:</span>
            <select
              value={sessionsPerPage}
              onChange={(e) => {
                setSessionsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="input-field px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>

        {sessions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">Member</th>
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">Video</th>
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">Duration</th>
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">Started</th>
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">IP Address</th>
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">Country</th>
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">Device</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSessions.map((session) => (
                    <tr key={session.id} className="border-b border-gray-700/50 hover:bg-gray-800/30">
                      {/* Member */}
                      <td className="py-3 px-4">
                        <Link 
                          to={`/admin/members/${session.discord_id}`}
                          className="flex items-center gap-2 hover:text-theme-light transition-colors"
                        >
                          {session.member_avatar ? (
                            <img 
                              src={session.member_avatar} 
                              alt="Avatar"
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-theme/20 flex items-center justify-center">
                              <User size={12} className="text-theme-light" />
                            </div>
                          )}
                          <span className="truncate max-w-[120px]">
                            {session.member_name || session.discord_id.slice(0, 10) + '...'}
                          </span>
                        </Link>
                      </td>
                      {/* Video */}
                      <td className="py-3 px-4">
                        <Link 
                          to={`/watch/${session.video_id}`}
                          className="text-gray-300 hover:text-theme-light transition-colors truncate block max-w-[180px]"
                        >
                          {session.videos?.title || 'Unknown'}
                        </Link>
                      </td>
                      {/* Duration */}
                      <td className="py-3 px-4 text-gray-400">
                        {formatDuration(session.watch_seconds)}
                      </td>
                      {/* Started */}
                      <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{formatTimeAgo(session.started_at)}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(session.started_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>
                      {/* IP Address */}
                      <td className="py-3 px-4 font-mono text-xs text-gray-500">
                        {session.ip_address === '::1' || session.ip_address === '127.0.0.1' || session.ip_address?.startsWith('1::')
                          ? 'Local'
                          : session.ip_address || '-'}
                      </td>
                      {/* Country */}
                      <td className="py-3 px-4 text-gray-400">
                        {session.ip_address === '::1' || session.ip_address === '127.0.0.1' || session.ip_address?.startsWith('1::')
                          ? 'Local'
                          : session.country || '-'}
                      </td>
                      {/* Device */}
                      <td className="py-3 px-4 text-gray-500 text-xs max-w-[150px] truncate" title={session.user_agent}>
                        {session.user_agent?.includes('Mobile') ? 'Mobile' : 
                         session.user_agent?.includes('Windows') ? 'Windows' :
                         session.user_agent?.includes('Mac') ? 'Mac' :
                         session.user_agent?.includes('Linux') ? 'Linux' : 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  Showing {startIndex + 1}-{Math.min(endIndex, sessions.length)} of {sessions.length} sessions
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-400 text-center py-8">No sessions recorded yet</p>
        )}
      </div>
    </Layout>
  )
}
