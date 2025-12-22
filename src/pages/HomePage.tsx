import { useEffect, useState, useMemo } from 'react'
import { Video } from '../types'
import { api } from '../lib/api'
import { VideoCard } from '../components/VideoCard'
import { Layout } from '../components/Layout'
import { FloatingNewRunButton } from '../components/FloatingNewRunButton'
import { useLanguage } from '../context/LanguageContext'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { Film, Loader, Search, Trophy, User, X, RefreshCw, Home } from 'lucide-react'

export function HomePage() {
  const { t } = useLanguage()
  const [videos, setVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSeason, setSelectedSeason] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'popular'>('all')

  const fetchVideos = async () => {
    try {
      setIsLoading(true)
      const { videos } = await api.getVideos()
      setVideos(videos.filter((v) => v.is_published))
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  const { isPulling, pullDistance } = usePullToRefresh(fetchVideos)

  // Get unique values for filters
  const seasons = useMemo(() => 
    [...new Set(videos.map(v => v.season).filter(Boolean))].sort((a, b) => Number(b) - Number(a)),
    [videos]
  )

  // Filter videos based on active tab
  const tabFilteredVideos = useMemo(() => {
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    
    switch (activeTab) {
      case 'new':
        return videos.filter(v => new Date(v.created_at).getTime() > weekAgo)
      case 'popular':
        return [...videos].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
      default:
        return videos
    }
  }, [videos, activeTab])
  

  // Top uploaders (most videos)
  const topUploaders = useMemo(() => {
    const counts = new Map<string, { id: string, name: string, avatar?: string, count: number }>()
    videos.forEach(v => {
      if (v.uploaded_by && v.uploader_name) {
        const existing = counts.get(v.uploaded_by)
        if (existing) {
          existing.count++
        } else {
          counts.set(v.uploaded_by, { id: v.uploaded_by, name: v.uploader_name, avatar: v.uploader_avatar, count: 1 })
        }
      }
    })
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [videos])

  // Filter videos
  const filteredVideos = useMemo(() => {
    let filtered = tabFilteredVideos
    return filtered.filter(v => {
      const matchesSearch = !searchQuery || 
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.uploader_name?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSeason = !selectedSeason || v.season === selectedSeason
      return matchesSearch && matchesSeason
    })
  }, [tabFilteredVideos, searchQuery, selectedSeason])

  const hasActiveFilters = searchQuery || selectedSeason

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedSeason('')
  }

  return (
    <Layout>
      {/* Pull to Refresh Indicator */}
      {isPulling && (
        <div 
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-theme/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 text-white shadow-lg transition-all"
          style={{ 
            opacity: Math.min(pullDistance / 60, 1),
            transform: `translateX(-50%) translateY(${Math.min(pullDistance / 2, 30)}px)`
          }}
        >
          <RefreshCw size={16} className={pullDistance > 60 ? 'animate-spin' : ''} />
          <span className="text-sm font-medium">
            {pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Home className="w-8 h-8 text-theme" />
          <h1 className="text-3xl font-bold text-theme">{t('welcomeTitle')}</h1>
        </div>
        <p className="text-gray-400">{t('welcomeSubtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 md:pb-0">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
            activeTab === 'all' 
              ? 'bg-theme text-white' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {t('allVideos')}
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
            activeTab === 'new' 
              ? 'bg-theme text-white' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {t('newSevenDays')}
        </button>
        <button
          onClick={() => setActiveTab('popular')}
          className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
            activeTab === 'popular' 
              ? 'bg-theme text-white' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {t('popular')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="animate-spin text-theme-light" size={48} />
        </div>
      ) : (
        <>
          {/* Search & Filters */}
          <div className="card mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 focus:border-theme-light focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 focus:border-theme-light focus:outline-none text-sm"
                >
                  <option value="">{t('allSeasons')}</option>
                  {seasons.map(s => (
                    <option key={s} value={s}>{t('season')} {s}</option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors flex items-center gap-1"
                  >
                    <X size={14} />
                    {t('clear')}
                  </button>
                )}
              </div>
            </div>

            {/* Results count */}
            {hasActiveFilters && (
              <p className="text-sm text-gray-400 mt-3">
                {t('found')} {filteredVideos.length} {filteredVideos.length !== 1 ? t('videos') : t('video')}
              </p>
            )}
          </div>

          {/* Top Uploaders - Public View */}
          {topUploaders.length > 0 && !hasActiveFilters && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Trophy className="text-yellow-400" size={20} />
                {t('topUploaders')}
              </h2>
              <div className="flex flex-wrap gap-3">
                {topUploaders.map((uploader, index) => (
                  <div
                    key={uploader.id}
                    className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg"
                  >
                    <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                      #{index + 1}
                    </span>
                    {uploader.avatar ? (
                      <img 
                        src={uploader.avatar.startsWith('http') ? uploader.avatar : `https://cdn.discordapp.com/avatars/${uploader.id}/${uploader.avatar}.png`}
                        alt={uploader.name}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-theme/20 flex items-center justify-center">
                        <User size={12} className="text-theme-light" />
                      </div>
                    )}
                    <span className="text-sm">{uploader.name}</span>
                    <span className="text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">{uploader.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos Grid */}
          <div className="animate-fade-in">
          {filteredVideos.length === 0 ? (
            <div className="text-center py-20">
              <Film size={64} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">
                {t('noVideos')}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 bg-theme hover:opacity-90 rounded-lg text-sm"
                >
                  {t('clear')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredVideos.map((video, index) => (
                <div key={video.id} className="stagger-item" style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s` }}>
                  <VideoCard video={video} />
                </div>
              ))}
            </div>
          )}
          </div>
        </>
      )}
      
      <FloatingNewRunButton />
    </Layout>
  )
}
