import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { api } from '../../lib/api'
import { useLanguage } from '../../context/LanguageContext'
import { ViewSession } from '../../types'
import { Loader, Eye, ChevronLeft, ChevronRight, User, Clock, Globe, Monitor, Search, X, MoreHorizontal, Fingerprint, Chrome, Smartphone, Laptop } from 'lucide-react'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

interface SessionWithDetails extends ViewSession {
  videos?: { title: string }
  member_name?: string
  member_avatar?: string
}

// Parse user agent for detailed info
function parseUserAgent(ua?: string) {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' }
  
  // Browser detection
  let browser = 'Unknown'
  if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('Chrome/')) browser = 'Chrome'
  else if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera'
  
  // OS detection
  let os = 'Unknown'
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11'
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1'
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7'
  else if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS X')) os = 'macOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  else if (ua.includes('Linux')) os = 'Linux'
  
  // Device type
  let device = 'Desktop'
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) device = 'Mobile'
  else if (ua.includes('iPad') || ua.includes('Tablet')) device = 'Tablet'
  
  return { browser, os, device }
}

export function SessionsPage() {
  const { t } = useLanguage()
  const [sessions, setSessions] = useState<SessionWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [sessionsPerPage, setSessionsPerPage] = useState(25)
  const [watermarkSearch, setWatermarkSearch] = useState('')
  const [searchResult, setSearchResult] = useState<SessionWithDetails | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null)
  const [selectedVideoFilter, setSelectedVideoFilter] = useState<string>('')
  const [showCountriesModal, setShowCountriesModal] = useState(false)

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

  const handleSearch = () => {
    if (!watermarkSearch.trim()) {
      setSearchResult(null)
      setSearchError(null)
      return
    }
    
    setIsSearching(true)
    setSearchError(null)
    
    const query = watermarkSearch.trim().toLowerCase()
    
    // Search across multiple fields
    const results = sessions.filter(s => 
      s.watermark_code?.toLowerCase().includes(query) ||
      s.country?.toLowerCase().includes(query) ||
      s.city?.toLowerCase().includes(query) ||
      s.member_name?.toLowerCase().includes(query) ||
      s.discord_id?.toLowerCase().includes(query) ||
      s.isp?.toLowerCase().includes(query) ||
      s.ip_address?.toLowerCase().includes(query)
    )
    
    if (results.length > 0) {
      setSearchResult(results[0])
      setSearchError(results.length > 1 ? `Found ${results.length} sessions (showing first)` : null)
    } else {
      setSearchResult(null)
      setSearchError('No sessions found matching your search')
    }
    setIsSearching(false)
  }

  const clearSearch = () => {
    setWatermarkSearch('')
    setSearchResult(null)
    setSearchError(null)
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

  // Get unique videos for filter dropdown
  const uniqueVideos = [...new Map(sessions.map(s => [s.video_id, { id: s.video_id, title: s.videos?.title }])).values()]

  // Filter sessions by selected video
  const filteredSessions = selectedVideoFilter 
    ? sessions.filter(s => s.video_id === selectedVideoFilter)
    : sessions

  // Pagination
  const totalPages = Math.ceil(filteredSessions.length / sessionsPerPage)
  const startIndex = (currentPage - 1) * sessionsPerPage
  const endIndex = startIndex + sessionsPerPage
  const paginatedSessions = filteredSessions.slice(startIndex, endIndex)

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
        <div className="flex items-center gap-3 mb-2">
          <Clock className="w-8 h-8 text-theme" />
          <h1 className="text-3xl font-bold text-theme">{t('sessionsLogTitle')}</h1>
        </div>
        <p className="text-gray-400">{t('sessionsLogSubtitle')}</p>
      </div>

      {/* Watermark Search */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Search className="text-theme-light" size={20} />
          {t('searchSessions')}
        </h2>
        <p className="text-gray-400 text-sm mb-3">{t('searchSessionsHint')}</p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={watermarkSearch}
              onChange={(e) => setWatermarkSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-theme-light focus:outline-none"
            />
            {watermarkSearch && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || !watermarkSearch.trim()}
            className="px-6 py-3 bg-theme hover:opacity-90 rounded-lg font-medium transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {isSearching ? <Loader className="animate-spin" size={18} /> : <Search size={18} />}
            {t('search')}
          </button>
        </div>

        {/* Search Result */}
        {searchResult && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <h3 className="text-green-400 font-semibold mb-3">{t('sessionFound')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Member</p>
                <Link 
                  to={`/admin/members/${searchResult.discord_id}`}
                  className="text-theme-light hover:underline flex items-center gap-2"
                >
                  {searchResult.member_avatar ? (
                    <img src={searchResult.member_avatar} alt="" className="w-5 h-5 rounded-full" />
                  ) : (
                    <User size={14} />
                  )}
                  {searchResult.member_name || searchResult.discord_id.slice(0, 10) + '...'}
                </Link>
              </div>
              <div>
                <p className="text-gray-400">Video</p>
                <Link 
                  to={`/watch/${searchResult.video_id}`}
                  className="text-theme-light hover:underline"
                >
                  {searchResult.videos?.title || 'Unknown'}
                </Link>
              </div>
              <div>
                <p className="text-gray-400">{t('watchDuration')}</p>
                <p className="text-white">{formatDuration(searchResult.watch_seconds)}</p>
              </div>
              <div>
                <p className="text-gray-400">{t('startedAt')}</p>
                <p className="text-white">
                  {new Date(searchResult.started_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <p className="text-gray-400">IP Address</p>
                <p className="text-white font-mono text-xs">
                  {searchResult.ip_address === '::1' || searchResult.ip_address === '127.0.0.1' 
                    ? 'Local' 
                    : searchResult.ip_address || '-'}
                </p>
              </div>
              <div>
                <p className="text-gray-400">{t('location')}</p>
                <p className="text-white">
                  {searchResult.country || '-'}
                  {searchResult.city && <span className="text-gray-400"> - {searchResult.city}</span>}
                </p>
              </div>
              <div>
                <p className="text-gray-400">{t('device')}</p>
                <p className="text-white">
                  {searchResult.user_agent?.includes('Mobile') ? 'Mobile' : 
                   searchResult.user_agent?.includes('Windows') ? 'Windows' :
                   searchResult.user_agent?.includes('Mac') ? 'Mac' :
                   searchResult.user_agent?.includes('Linux') ? 'Linux' : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-gray-400">{t('watermarkCode')}</p>
                <p className="text-green-400 font-mono">{searchResult.watermark_code}</p>
              </div>
            </div>
            {/* View Full Details Button */}
            <button
              onClick={() => setSelectedSession(searchResult)}
              className="mt-4 w-full py-2 bg-theme hover:opacity-90 rounded-lg font-medium transition-opacity flex items-center justify-center gap-2"
            >
              <Eye size={18} />
              {t('viewFullDetails')}
            </button>
          </div>
        )}

        {/* Search Error */}
        {searchError && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400">{searchError}</p>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <Eye className="mx-auto mb-2 text-theme-light" size={24} />
          <p className="text-2xl font-bold">{sessions.length}</p>
          <p className="text-sm text-gray-400">{t('totalSessions')}</p>
        </div>
        <div className="card text-center">
          <Clock className="mx-auto mb-2 text-green-400" size={24} />
          <p className="text-2xl font-bold">
            {formatDuration(sessions.reduce((sum, s) => sum + (s.watch_seconds || 0), 0))}
          </p>
          <p className="text-sm text-gray-400">{t('totalWatchTime')}</p>
        </div>
        <div className="card text-center">
          <User className="mx-auto mb-2 text-purple-400" size={24} />
          <p className="text-2xl font-bold">{new Set(sessions.map(s => s.discord_id)).size}</p>
          <p className="text-sm text-gray-400">{t('uniqueViewers')}</p>
        </div>
        <div 
          className="card text-center cursor-pointer hover:bg-gray-800/50 transition-colors"
          onClick={() => setShowCountriesModal(true)}
        >
          <Globe className="mx-auto mb-2 text-blue-400" size={24} />
          <p className="text-2xl font-bold">{new Set(sessions.map(s => s.country).filter(Boolean)).size}</p>
          <p className="text-sm text-gray-400">{t('countries')}</p>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Monitor className="text-theme-light" size={20} />
            {selectedVideoFilter ? t('filteredSessions') : t('allSessions')}
            {selectedVideoFilter && (
              <span className="text-sm font-normal text-gray-400">
                ({filteredSessions.length} {t('sessionsCount')})
              </span>
            )}
          </h2>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Video Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">{t('video')}:</span>
              <select
                value={selectedVideoFilter}
                onChange={(e) => {
                  setSelectedVideoFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="input-field px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded max-w-[200px]"
              >
                <option value="">{t('allVideos')}</option>
                {uniqueVideos.map(video => (
                  <option key={video.id} value={video.id}>
                    {video.title || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
            {/* Page Size */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">{t('show')}:</span>
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
        </div>

        {sessions.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">{t('member')}</th>
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">{t('video')}</th>
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">{t('country')}</th>
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">{t('duration')}</th>
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">{t('started')}</th>
                    <th className="py-3 px-4 text-right text-gray-400 font-medium">{t('more')}</th>
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
                          <span className="break-words">
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
                      {/* Country */}
                      <td className="py-3 px-4 text-gray-400">
                        {session.ip_address === '::1' || session.ip_address === '127.0.0.1' 
                          ? 'Local' 
                          : session.country || '-'}
                      </td>
                      {/* Duration */}
                      <td className="py-3 px-4 text-gray-400">
                        {formatDuration(session.watch_seconds)}
                      </td>
                      {/* Started */}
                      <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                        {formatTimeAgo(session.started_at)}
                      </td>
                      {/* More Button */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedSession(session)}
                          className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
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
              {paginatedSessions.map((session) => (
                <div key={session.id} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-start justify-between mb-4">
                    <Link 
                      to={`/admin/members/${session.discord_id}`}
                      className="flex items-center gap-3 flex-1"
                    >
                      {session.member_avatar ? (
                        <img 
                          src={session.member_avatar} 
                          alt="Avatar"
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-theme/20"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-theme/20 flex items-center justify-center ring-2 ring-theme/20">
                          <User size={24} className="text-theme-light" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-theme-light font-semibold text-base">
                          {session.member_name || session.discord_id.slice(0, 10) + '...'}
                        </h3>
                        <p className="text-xs text-gray-400">{formatTimeAgo(session.started_at)}</p>
                      </div>
                    </Link>
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
                      {session.videos?.title || 'Unknown'}
                    </div>
                  </Link>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <span className="text-gray-400 text-xs block mb-1">{t('country')}:</span>
                      <span className="text-gray-100 font-medium">
                        {session.ip_address === '::1' || session.ip_address === '127.0.0.1' 
                          ? 'Local' 
                          : (
                            <>
                              {session.country || '-'}
                              {session.city && `, ${session.city}`}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  {t('showingSessions')} {startIndex + 1}-{Math.min(endIndex, filteredSessions.length)} {t('ofSessions')} {filteredSessions.length} {t('sessionsCount')}
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
                    {t('page')} {currentPage} {t('ofSessions')} {totalPages}
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
          <p className="text-gray-400 text-center py-8">{t('noSessionsYet')}</p>
        )}
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSession(null)}
        >
          <div 
            className="bg-discord-dark rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Eye className="text-theme-light" size={24} />
                {t('sessionDetails')}
              </h2>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Member & Video */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">{t('member')}</p>
                  <Link 
                    to={`/admin/members/${selectedSession.discord_id}`}
                    className="flex items-center gap-3 hover:text-theme-light transition-colors"
                    onClick={() => setSelectedSession(null)}
                  >
                    {selectedSession.member_avatar ? (
                      <img src={selectedSession.member_avatar} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-theme/20 flex items-center justify-center">
                        <User size={20} className="text-theme-light" />
                      </div>
                    )}
                    <span className="font-medium">{selectedSession.member_name || selectedSession.discord_id}</span>
                  </Link>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">{t('video')}</p>
                  <Link 
                    to={`/watch/${selectedSession.video_id}`}
                    className="text-theme-light hover:underline font-medium"
                    onClick={() => setSelectedSession(null)}
                  >
                    {selectedSession.videos?.title || 'Unknown'}
                  </Link>
                </div>
              </div>

              {/* Time Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                    <Clock size={14} />
                    {t('watchDuration')}
                  </p>
                  <p className="text-xl font-bold text-green-400">{formatDuration(selectedSession.watch_seconds)}</p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">{t('startedAt')}</p>
                  <p className="font-medium">
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
              </div>

              {/* Location & Network */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                    <Globe size={14} />
                    {t('location')}
                  </p>
                  <p className="font-medium">
                    {selectedSession.ip_address === '::1' || selectedSession.ip_address === '127.0.0.1' 
                      ? t('localDevelopment') 
                      : (
                        <>
                          {selectedSession.country || 'Unknown'}
                          {selectedSession.city && (
                            <span className="text-gray-400"> - {selectedSession.city}</span>
                          )}
                        </>
                      )}
                  </p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">{t('ipAddress')}</p>
                  <p className="font-mono text-sm">
                    {selectedSession.ip_address === '::1' || selectedSession.ip_address === '127.0.0.1' 
                      ? 'localhost' 
                      : selectedSession.ip_address || '-'}
                  </p>
                </div>
              </div>

              {/* Device Info */}
              {(() => {
                const ua = parseUserAgent(selectedSession.user_agent)
                return (
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm mb-3 flex items-center gap-2">
                      <Monitor size={14} />
                      {t('deviceInfo')}
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">{t('deviceType')}</p>
                        <p className="font-medium flex items-center gap-2">
                          {ua.device === 'Mobile' ? <Smartphone size={16} /> : <Laptop size={16} />}
                          {ua.device}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('os')}</p>
                        <p className="font-medium">{ua.os}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('browser')}</p>
                        <p className="font-medium flex items-center gap-2">
                          <Chrome size={16} />
                          {ua.browser}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* VPN/Proxy & ISP */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${selectedSession.is_vpn ? 'bg-red-500/10 border border-red-500/30' : 'bg-gray-800/50'}`}>
                  <p className="text-gray-400 text-sm mb-1">{t('vpnProxy')}</p>
                  {selectedSession.is_vpn ? (
                    <p className="font-medium text-red-400 flex items-center gap-2">
                      ⚠️ {t('detected')}
                    </p>
                  ) : (
                    <p className="font-medium text-green-400">✓ {t('notDetected')}</p>
                  )}
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">{t('isp')}</p>
                  <p className="font-medium">{selectedSession.isp || '-'}</p>
                </div>
              </div>

              {/* Watermark Code */}
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                  <Fingerprint size={14} />
                  {t('watermarkCode')}
                </p>
                <p className="font-mono text-lg text-theme-light">{selectedSession.watermark_code || '-'}</p>
              </div>

              {/* Raw User Agent */}
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">{t('rawUserAgent')}</p>
                <p className="font-mono text-xs text-gray-500 break-all">
                  {selectedSession.user_agent || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Countries Modal */}
      {showCountriesModal && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCountriesModal(false)}
        >
          <div 
            className="bg-discord-dark rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Globe className="text-blue-400" size={24} />
                {t('countriesAndMembers')}
              </h2>
              <button
                onClick={() => setShowCountriesModal(false)}
                className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {(() => {
                // Group sessions by country
                const countriesMap = new Map<string, Set<string>>()
                sessions.forEach(s => {
                  if (s.country && s.country !== 'unknown') {
                    if (!countriesMap.has(s.country)) {
                      countriesMap.set(s.country, new Set())
                    }
                    countriesMap.get(s.country)?.add(s.member_name || s.discord_id)
                  }
                })
                
                const countriesArray = Array.from(countriesMap.entries())
                  .sort((a, b) => b[1].size - a[1].size)
                
                return (
                  <div className="space-y-4">
                    {countriesArray.map(([country, members]) => (
                      <div key={country} className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Globe size={18} className="text-blue-400" />
                            {country}
                          </h3>
                          <span className="text-sm text-gray-400 bg-gray-700 px-2 py-1 rounded">
                            {members.size} {members.size === 1 ? 'member' : 'members'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(members).map(member => (
                            <Link
                              key={member}
                              to={`/admin/members/${sessions.find(s => s.member_name === member || s.discord_id === member)?.discord_id}`}
                              onClick={() => setShowCountriesModal(false)}
                              className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-2"
                            >
                              <User size={14} />
                              {member}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                    {countriesArray.length === 0 && (
                      <p className="text-gray-400 text-center py-8">{t('noCountryData')}</p>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
