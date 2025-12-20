import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import { Shield, Search, Filter, CheckCircle, XCircle, User, Clock, MapPin, Monitor, AlertTriangle, Loader } from 'lucide-react'

interface LoginLog {
  id: string
  discord_id: string
  discord_username?: string
  discord_discriminator?: string
  discord_avatar?: string
  email?: string
  status: 'success' | 'failed'
  failure_reason?: string
  ip_address?: string
  country?: string
  city?: string
  user_agent?: string
  is_admin: boolean
  is_member: boolean
  has_required_role: boolean
  created_at: string
}

interface LoginLogsResponse {
  logs: LoginLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function LoginLogsPage() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [logs, setLogs] = useState<LoginLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    if (!user?.is_admin) {
      navigate('/')
      return
    }
    fetchLogs()
  }, [page, statusFilter, searchQuery])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(
        `/.netlify/functions/admin-login-logs?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error('Failed to fetch logs')

      const data: LoginLogsResponse = await response.json()
      setLogs(data.logs)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching login logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    setPage(1)
  }

  const getStatusBadge = (status: string) => {
    if (status === 'success') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" />
          Success
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="w-3 h-3" />
        Failed
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date)
  }

  const getUserAgent = (ua?: string) => {
    if (!ua) return 'Unknown'
    if (ua.includes('Mobile')) return 'Mobile'
    if (ua.includes('Windows')) return 'Windows'
    if (ua.includes('Mac')) return 'Mac'
    if (ua.includes('Linux')) return 'Linux'
    return 'Other'
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-end gap-3 mb-2">
            <h1 className="text-3xl font-bold text-theme-light">Login Logs</h1>
            <Shield className="w-8 h-8 text-theme" />
          </div>
          <p className="text-gray-400 text-right">
            Track all login attempts including successful and failed attempts
          </p>
        </div>

        {/* Filters */}
        <div className="bg-discord-dark rounded-lg border border-gray-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by username, Discord ID, or email..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-theme focus:border-transparent"
                />
              </div>
            </form>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'all' | 'success' | 'failed')
                  setPage(1)
                }}
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-theme focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="success">Success Only</option>
                <option value="failed">Failed Only</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Total Logs: <span className="font-semibold text-theme-light">{total}</span>
            </p>
          </div>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="bg-discord-dark rounded-lg border border-gray-700 p-12 text-center">
            <Loader className="animate-spin h-12 w-12 text-theme mx-auto" />
            <p className="mt-4 text-gray-400">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-discord-dark rounded-lg border border-gray-700 p-12 text-center">
            <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No login logs found</p>
          </div>
        ) : (
          <div className="bg-discord-dark rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Failure Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Device
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Permissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-discord-dark divide-y divide-gray-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-800/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {log.discord_avatar ? (
                            <img
                              src={log.discord_avatar}
                              alt={log.discord_username}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <Link
                              to={`/admin/members/${log.discord_id}`}
                              className="font-medium text-theme hover:text-theme-light"
                            >
                              {log.discord_username || 'Unknown'}
                            </Link>
                            <p className="text-xs text-gray-500">{log.discord_id.slice(0, 18)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-6 py-4">
                        {log.failure_reason ? (
                          <div className="flex items-start gap-2 max-w-xs">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-red-600">{log.failure_reason}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <div>
                            <div>{log.city || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{log.country || 'Unknown'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Monitor className="w-4 h-4 text-gray-400" />
                          <div>
                            <div>{getUserAgent(log.user_agent)}</div>
                            <div className="text-xs text-gray-500">{log.ip_address || 'Unknown'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {log.is_admin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              <CheckCircle className="w-3 h-3" />
                              Admin
                            </span>
                          )}
                          {log.is_member && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              <CheckCircle className="w-3 h-3" />
                              Member
                            </span>
                          )}
                          {log.has_required_role && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                              <CheckCircle className="w-3 h-3" />
                              Role
                            </span>
                          )}
                          {!log.is_admin && !log.is_member && !log.has_required_role && (
                            <span className="text-gray-400 text-xs">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(log.created_at)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
