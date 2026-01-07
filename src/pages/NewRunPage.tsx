import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { Upload, ArrowLeft, Play } from 'lucide-react'

export function NewRunPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [displayName, setDisplayName] = useState<string>('')
  const [uploadData, setUploadData] = useState({
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch member data to get discord_global_name
  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        const response = await api.getMembers()
        const currentMember = response.members.find((m: any) => m.discord_id === user?.discord_id)
        if (currentMember) {
          setDisplayName(currentMember.discord_global_name || currentMember.discord_username || user?.username || 'Player')
        } else {
          setDisplayName(user?.username || 'Player')
        }
      } catch (error) {
        console.error('Failed to fetch member data:', error)
        setDisplayName(user?.username || 'Player')
      }
    }

    if (user) {
      fetchMemberData()
    }
  }, [user])

  // Generate title automatically
  const generateTitle = () => {
    const playerName = displayName || user?.username || user?.game_id || 'Player'
    const season = uploadData.season ? `S${uploadData.season.replace(/[^0-9]/g, '')}` : ''
    const day = uploadData.day ? `DAY ${uploadData.day.replace(/[^0-9]/g, '')}` : ''
    
    const parts = [playerName]
    if (season) parts.push(season)
    if (day) parts.push(day)
    
    return parts.join(' - ')
  }

  const generatedTitle = generateTitle()

  const handleUpload = () => {
    if (!selectedFile || !uploadData.season || !uploadData.day) return
    navigate('/uploading', {
      state: {
        uploadData,
        file: selectedFile,
        displayName,
      },
    })
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          {t('back')}
        </button>

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Play size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('newRunTitle')}</h1>
              <p className="text-gray-400 text-sm">{t('newRunSubtitle')}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Auto-generated Title Preview */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-4 text-center">
              <p className="text-xl font-bold text-theme-light">
                {generatedTitle || 'Enter Season & Day below'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('seasonLabel')} *</label>
                <input
                  type="text"
                  value={uploadData.season}
                  onChange={(e) => setUploadData((d) => ({ ...d, season: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g. 157"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('dayLabel')} *</label>
                <input
                  type="text"
                  value={uploadData.day}
                  onChange={(e) => setUploadData((d) => ({ ...d, day: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g. 12"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('winsAttacks')}</label>
                <input
                  type="text"
                  value={uploadData.wins_attacks}
                  onChange={(e) => setUploadData((d) => ({ ...d, wins_attacks: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g. 15/20"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('arenaTime')}</label>
                <input
                  type="text"
                  value={uploadData.arena_time}
                  onChange={(e) => setUploadData((d) => ({ ...d, arena_time: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g. 45:30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('shieldHits')}</label>
              <input
                type="text"
                value={uploadData.shield_hits}
                onChange={(e) => setUploadData((d) => ({ ...d, shield_hits: e.target.value }))}
                className="input-field w-full"
                placeholder={t('shieldHitsPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('overtimeStatus')}</label>
              <select
                value={uploadData.overtime_type}
                onChange={(e) => setUploadData((d) => ({ ...d, overtime_type: e.target.value }))}
                className="input-field w-full"
              >
                <option value="none">{t('none')}</option>
                <option value="last_hit">{t('lastHitOvertime')}</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('startRank')}</label>
                <input
                  type="text"
                  value={uploadData.start_rank}
                  onChange={(e) => setUploadData((d) => ({ ...d, start_rank: e.target.value }))}
                  className="input-field w-full"
                  placeholder={t('startingRank')}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('endRank')}</label>
                <input
                  type="text"
                  value={uploadData.end_rank}
                  onChange={(e) => setUploadData((d) => ({ ...d, end_rank: e.target.value }))}
                  className="input-field w-full"
                  placeholder={t('endingRank')}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="has_commentary"
                checked={uploadData.has_commentary}
                onChange={(e) => setUploadData((d) => ({ ...d, has_commentary: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="has_commentary" className="text-sm text-gray-400">
                {t('videoHasCommentary')}
              </label>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('description')}</label>
              <textarea
                value={uploadData.description}
                onChange={(e) => setUploadData((d) => ({ ...d, description: e.target.value }))}
                className="input-field w-full h-20 resize-none"
                placeholder={t('descriptionPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('videoFile')} *</label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-green-500/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  id="video-file"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setSelectedFile(file)
                    }
                  }}
                />
                <label htmlFor="video-file" className="cursor-pointer">
                  <Upload size={32} className={`mx-auto mb-2 ${selectedFile ? 'text-theme-light' : 'text-gray-400'}`} />
                  <p className={selectedFile ? 'text-theme-light font-medium' : 'text-gray-400'}>
                    {selectedFile ? selectedFile.name : t('clickToSelectVideo')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedFile 
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                      : 'MP4, MOV, AVI up to 10GB'
                    }
                  </p>
                </label>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={!uploadData.season || !uploadData.day || !selectedFile}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <>
                <Play size={20} />
                {t('upload')}
              </>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
