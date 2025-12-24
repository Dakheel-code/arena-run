import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Video } from '../types'
import { ArrowLeft, Loader, Save } from 'lucide-react'

export function EditVideoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [video, setVideo] = useState<Video | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    description: '',
    season: '',
    day: '',
    wins_attacks: '',
    arena_time: '',
    shield_hits: '',
    overtime_type: 'none',
    start_rank: '',
    end_rank: '',
    has_commentary: false,
  })

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return
      try {
        const { video } = await api.getVideo(id)
        setVideo(video)
        
        // Check if user is the owner
        if (video.uploaded_by !== user?.discord_id && !user?.is_admin) {
          setError('You do not have permission to edit this video')
          return
        }
        
        setFormData({
          description: video.description || '',
          season: video.season || '',
          day: video.day || '',
          wins_attacks: video.wins_attacks || '',
          arena_time: video.arena_time || '',
          shield_hits: video.shield_hits || '',
          overtime_type: video.overtime_type || 'none',
          start_rank: video.start_rank || '',
          end_rank: video.end_rank || '',
          has_commentary: video.has_commentary || false,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video')
      } finally {
        setIsLoading(false)
      }
    }
    fetchVideo()
  }, [id, user])

  const handleSave = async () => {
    if (!video) return
    setIsSaving(true)
    
    try {
      await api.updateVideo(video.id, formData)
      navigate(`/watch/${video.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
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

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            to={`/watch/${video.id}`}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Video
          </Link>
        </div>

        <div className="bg-discord-dark rounded-xl p-6">
          <h1 className="text-2xl font-bold mb-6">Edit Video</h1>
          
          {/* Title (Read-only) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Title (Cannot be changed)
            </label>
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-400">
              {video.title}
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-theme-light focus:outline-none resize-none"
              rows={3}
              placeholder="Add a description..."
            />
          </div>

          {/* Season & Day */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Season
              </label>
              <input
                type="text"
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-theme-light focus:outline-none"
                placeholder="e.g. 15"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Day
              </label>
              <input
                type="text"
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-theme-light focus:outline-none"
                placeholder="e.g. 1"
              />
            </div>
          </div>

          {/* Game Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Wins/Attacks
              </label>
              <input
                type="text"
                value={formData.wins_attacks}
                onChange={(e) => setFormData({ ...formData, wins_attacks: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-theme-light focus:outline-none"
                placeholder="e.g. 8/8"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Arena Time
              </label>
              <input
                type="text"
                value={formData.arena_time}
                onChange={(e) => setFormData({ ...formData, arena_time: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-theme-light focus:outline-none"
                placeholder="e.g. 45:30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Shield Hits
              </label>
              <input
                type="text"
                value={formData.shield_hits}
                onChange={(e) => setFormData({ ...formData, shield_hits: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-theme-light focus:outline-none"
                placeholder="e.g. 3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Overtime
              </label>
              <select
                value={formData.overtime_type}
                onChange={(e) => setFormData({ ...formData, overtime_type: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-theme-light focus:outline-none"
              >
                <option value="none">None</option>
                <option value="last_hit">Last hit went overtime</option>
                <option value="previous_day">From previous day</option>
              </select>
            </div>
          </div>

          {/* Rank */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Start Rank
              </label>
              <input
                type="text"
                value={formData.start_rank}
                onChange={(e) => setFormData({ ...formData, start_rank: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-theme-light focus:outline-none"
                placeholder="e.g. 150"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                End Rank
              </label>
              <input
                type="text"
                value={formData.end_rank}
                onChange={(e) => setFormData({ ...formData, end_rank: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-theme-light focus:outline-none"
                placeholder="e.g. 50"
              />
            </div>
          </div>

          {/* Commentary Toggle */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.has_commentary}
                onChange={(e) => setFormData({ ...formData, has_commentary: e.target.checked })}
                className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-theme-light focus:ring-theme-light"
              />
              <span className="text-sm font-medium">Has Commentary</span>
            </label>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-theme hover:opacity-90 text-white font-medium py-3 rounded-lg transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader className="animate-spin" size={20} />
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </Layout>
  )
}
