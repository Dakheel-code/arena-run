import { useEffect, useState, useRef } from 'react'
import { Layout } from '../../components/Layout'
import { api } from '../../lib/api'
import { useLanguage } from '../../context/LanguageContext'
import { Member } from '../../types'
import { Upload, Search, UserCheck, UserX, Loader, FileSpreadsheet, Eye, ChevronLeft, ChevronRight, Plus, X, User, Users, Shield, Crown, Edit3 } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import Papa from 'papaparse'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export function MembersPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [membersPerPage, setMembersPerPage] = useState(20)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMember, setNewMember] = useState({ discord_id: '', discord_username: '' })
  const [isAdding, setIsAdding] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    let filtered = members.filter(
      (m) =>
        m.discord_id.includes(searchQuery) ||
        m.game_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.discord_username && m.discord_username.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.discord_global_name && m.discord_global_name.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    // Sort by last_login (most recent first), null values at the end
    filtered = filtered.sort((a, b) => {
      if (!a.last_login && !b.last_login) return 0
      if (!a.last_login) return 1
      if (!b.last_login) return -1
      return new Date(b.last_login).getTime() - new Date(a.last_login).getTime()
    })
    setFilteredMembers(filtered)
    setCurrentPage(1) // Reset to first page on search
  }, [members, searchQuery])

  const fetchMembers = async () => {
    try {
      const result = await api.getMembers()
      console.log('Members API result:', result)
      // Sort by last_login on initial load
      const sorted = (result.members || []).sort((a: Member, b: Member) => {
        if (!a.last_login && !b.last_login) return 0
        if (!a.last_login) return 1
        if (!b.last_login) return -1
        return new Date(b.last_login).getTime() - new Date(a.last_login).getTime()
      })
      setMembers(sorted)
      setFilteredMembers(sorted)
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage)
  const startIndex = (currentPage - 1) * membersPerPage
  const endIndex = startIndex + membersPerPage
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          const membersData = (results.data as Record<string, string>[])
            .filter((row) => row.discord_id && row.game_id)
            .map((row) => ({
              discord_id: row.discord_id.trim(),
              game_id: row.game_id.trim(),
            }))

          if (membersData.length === 0) {
            alert('File contains no valid data')
            return
          }

          const { count } = await api.uploadMembers(membersData)
          alert(`Successfully added/updated ${count} members`)
          fetchMembers()
        } catch (error) {
          console.error('Upload failed:', error)
          alert('Failed to upload file')
        } finally {
          setIsUploading(false)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }
      },
      error: () => {
        alert('Failed to read file')
        setIsUploading(false)
      },
    })
  }

  const toggleMemberStatus = async (member: Member) => {
    try {
      await api.toggleMember(member.discord_id, !member.is_active)
      setMembers((prev) =>
        prev.map((m) =>
          m.discord_id === member.discord_id ? { ...m, is_active: !m.is_active } : m
        )
      )
    } catch (error) {
      console.error('Failed to toggle member:', error)
    }
  }

  const handleAddMember = async () => {
    if (!newMember.discord_id) {
      alert('Discord ID is required')
      return
    }

    setIsAdding(true)
    try {
      await api.addMember({
        discord_id: newMember.discord_id,
        game_id: newMember.discord_id,
        discord_username: newMember.discord_username
      })
      await fetchMembers()
      setShowAddModal(false)
      setNewMember({ discord_id: '', discord_username: '' })
      alert('Member added successfully!')
    } catch (error) {
      console.error('Failed to add member:', error)
      alert('Failed to add member')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-theme" />
          <h1 className="text-3xl font-bold text-theme">{t('manageMembersTitle')}</h1>
        </div>
        <p className="text-gray-400">{t('authorizedMembers')}</p>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={t('searchMembers')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pr-10"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-discord"
          >
            <Plus size={20} />
            {t('addMember')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="btn-discord"
          >
            {isUploading ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              <Upload size={20} />
            )}
            {t('uploadCsv')}
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <FileSpreadsheet size={16} />
          <span>{t('csvFormat')}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="animate-spin text-theme-light" size={48} />
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="card overflow-hidden hidden md:block">
            <table className="w-full" dir="rtl">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-right py-3 px-4">{t('member')}</th>
                  <th className="text-right py-3 px-4">Username</th>
                  <th className="text-right py-3 px-4">{t('discordId')}</th>
                  <th className="text-right py-3 px-4">{t('status')}</th>
                  <th className="text-right py-3 px-4">{t('lastLogin')}</th>
                  <th className="text-right py-3 px-4">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.map((member) => (
                  <tr key={member.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  {/* Member */}
                  <td className="py-3 px-4">
                    <Link 
                      to={`/admin/members/${member.discord_id}`}
                      className="flex items-center gap-3 hover:text-theme-light transition-colors"
                    >
                      {member.discord_avatar ? (
                        <img 
                          src={member.discord_avatar} 
                          alt={member.discord_global_name || member.discord_username || 'Avatar'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-theme/20 flex items-center justify-center">
                          <User size={20} className="text-theme-light" />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-theme-light font-medium">
                          {member.discord_global_name || member.discord_username || member.discord_id}
                        </span>
                        {member.role === 'super_admin' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            <Crown size={12} />
                            Super Admin
                          </span>
                        )}
                        {member.role === 'admin' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                            <Shield size={12} />
                            Admin
                          </span>
                        )}
                        {member.role === 'editor' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            <Edit3 size={12} />
                            Editor
                          </span>
                        )}
                      </div>
                    </Link>
                  </td>
                  {/* Username */}
                  <td className="py-3 px-4 text-sm text-gray-400">{member.discord_username || '-'}</td>
                  {/* Discord ID */}
                  <td className="py-3 px-4 font-mono text-sm text-gray-400">{member.discord_id}</td>
                  {/* Status */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                        member.is_active
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {member.is_active ? (
                        <>
                          <UserCheck size={14} /> {t('active')}
                        </>
                      ) : (
                        <>
                          <UserX size={14} /> {t('disabled')}
                        </>
                      )}
                    </span>
                  </td>
                  {/* Last Login */}
                  <td className="py-3 px-4 text-sm text-gray-400">
                    {member.last_login 
                      ? new Date(member.last_login).toLocaleDateString('en-US') 
                      : t('never')}
                  </td>
                  {/* Actions */}
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/admin/members/${member.discord_id}`)}
                        className="p-2 hover:bg-blue-500/20 text-blue-400 rounded transition-colors"
                        title={t('viewProfile')}
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => toggleMemberStatus(member)}
                        className={`text-sm px-3 py-1 rounded transition-colors ${
                          member.is_active
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        }`}
                      >
                        {member.is_active ? t('disable') : t('enable')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredMembers.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              {t('noMembersMatch')}
            </div>
          )}

          {/* Pagination */}
          {filteredMembers.length > 0 && (
            <div className="flex flex-col items-center gap-4 mt-6 pt-4 border-t border-gray-700">
              {/* Per-page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{t('show')}:</span>
                <select
                  value={membersPerPage}
                  onChange={(e) => {
                    setMembersPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="input-field px-3 py-1 text-sm bg-gray-800 border border-gray-600 rounded"
                >
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-400">{t('perPage')}</span>
              </div>

              {/* Page navigation */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                            currentPage === pageNum
                              ? 'bg-theme text-white'
                              : 'bg-gray-700/50 hover:bg-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {/* Info text */}
              <div className="text-sm text-gray-400">
                {t('showingMembers')} {startIndex + 1}-{Math.min(endIndex, filteredMembers.length)} {t('ofMembers')} {filteredMembers.length} {t('membersText')}
              </div>
            </div>
          )}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {paginatedMembers.map((member) => (
              <div key={member.id} className="card">
                <Link 
                  to={`/admin/members/${member.discord_id}`}
                  className="flex items-center gap-3 mb-4"
                >
                  {member.discord_avatar ? (
                    <img 
                      src={member.discord_avatar} 
                      alt={member.discord_global_name || member.discord_username || 'Avatar'}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-theme/20 flex items-center justify-center">
                      <User size={24} className="text-theme-light" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex-1">
                      <h3 className="text-theme-light font-medium">
                        {member.discord_global_name || member.discord_username || member.discord_id}
                      </h3>
                      <p className="text-sm text-gray-400">{member.discord_username || '-'}</p>
                      {member.role === 'super_admin' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          <Crown size={12} />
                          Super Admin
                        </span>
                      )}
                      {member.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                          <Shield size={12} />
                          Admin
                        </span>
                      )}
                      {member.role === 'editor' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          <Edit3 size={12} />
                          Editor
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      member.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {member.is_active ? (
                      <>
                        <UserCheck size={14} /> {t('active')}
                      </>
                    ) : (
                      <>
                        <UserX size={14} /> {t('disabled')}
                      </>
                    )}
                  </span>
                </Link>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('discordId')}:</span>
                    <span className="font-mono text-gray-300">{member.discord_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('lastLogin')}:</span>
                    <span className="text-gray-300">
                      {member.last_login 
                        ? new Date(member.last_login).toLocaleDateString('en-US') 
                        : t('never')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => navigate(`/admin/members/${member.discord_id}`)}
                    className="flex-1 btn-discord justify-center"
                  >
                    <Eye size={18} />
                    {t('viewProfile')}
                  </button>
                  <button
                    onClick={() => toggleMemberStatus(member)}
                    className={`flex-1 px-3 py-2 rounded transition-colors ${
                      member.is_active
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                  >
                    {member.is_active ? t('disable') : t('enable')}
                  </button>
                </div>
              </div>
            ))}

            {filteredMembers.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                {t('noMembersMatch')}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t('addNewMember')}</h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewMember({ discord_id: '', discord_username: '' })
                }}
                className="p-2 hover:bg-gray-700 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('discordId')} *</label>
                <input
                  type="text"
                  value={newMember.discord_id}
                  onChange={(e) => setNewMember(prev => ({ ...prev, discord_id: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g. 123456789012345678"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('discordUsername')} ({t('optional')})</label>
                <input
                  type="text"
                  value={newMember.discord_username}
                  onChange={(e) => setNewMember(prev => ({ ...prev, discord_username: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g. username#1234"
                />
              </div>

              <button
                onClick={handleAddMember}
                disabled={isAdding || !newMember.discord_id}
                className="btn-discord w-full justify-center"
              >
                {isAdding ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  <Plus size={20} />
                )}
                {t('addMember')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
