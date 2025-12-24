import { useEffect, useState } from 'react'
import { Layout } from '../../components/Layout'
import { api } from '../../lib/api'
import { Member, UserRole } from '../../types'
import { Shield, Search, Loader, User, Crown, Edit3, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: any; description: string }> = {
  super_admin: {
    label: 'Super Admin',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: Crown,
    description: 'Full system access and control'
  },
  admin: {
    label: 'Admin',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: Shield,
    description: 'Manage content and users'
  },
  editor: {
    label: 'Editor',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: Edit3,
    description: 'Edit and publish content'
  },
  member: {
    label: 'Member',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    icon: Users,
    description: 'Basic access'
  }
}

export function PermissionsPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all')

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    let filtered = members.filter(
      (m) =>
        m.discord_id.includes(searchQuery) ||
        m.game_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.discord_username && m.discord_username.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    
    if (selectedRole !== 'all') {
      filtered = filtered.filter(m => (m.role || 'member') === selectedRole)
    }
    
    setFilteredMembers(filtered)
  }, [members, searchQuery, selectedRole])

  const fetchMembers = async () => {
    try {
      const result = await api.getMembers()
      setMembers(result.members || [])
      setFilteredMembers(result.members || [])
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateRole = async (member: Member, newRole: UserRole) => {
    try {
      await api.updateMemberRole(member.discord_id, newRole)
      setMembers((prev) =>
        prev.map((m) => (m.discord_id === member.discord_id ? { ...m, role: newRole } : m))
      )
    } catch (error) {
      console.error('Failed to update role:', error)
      alert('Failed to update role')
    }
  }

  const getRoleStats = () => {
    const stats = {
      super_admin: 0,
      admin: 0,
      editor: 0,
      member: 0
    }
    members.forEach(m => {
      const role = m.role || 'member'
      stats[role]++
    })
    return stats
  }

  const roleStats = getRoleStats()

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Shield className="text-theme-light" size={32} />
          Permissions Management
        </h1>
        <p className="text-gray-400">Manage member roles and access levels</p>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {(Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => {
          const config = ROLE_CONFIG[role]
          const Icon = config.icon
          return (
            <div
              key={role}
              className={`card border ${config.color} cursor-pointer transition-all hover:scale-105`}
              onClick={() => setSelectedRole(selectedRole === role ? 'all' : role)}
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon size={24} />
                <span className="font-semibold">{config.label}</span>
              </div>
              <p className="text-2xl font-bold">{roleStats[role]}</p>
              <p className="text-xs mt-1 opacity-70">{config.description}</p>
            </div>
          )
        })}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pr-10"
            />
          </div>
        </div>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
          className="input-field md:w-48"
        >
          <option value="all">All Roles</option>
          {(Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => (
            <option key={role} value={role}>{ROLE_CONFIG[role].label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="animate-spin text-theme-light" size={48} />
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="card overflow-hidden hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4">Member</th>
                  <th className="text-left py-3 px-4">Game ID</th>
                  <th className="text-left py-3 px-4">Current Role</th>
                  <th className="text-left py-3 px-4">Change Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => {
                  const currentRole = member.role || 'member'
                  const RoleIcon = ROLE_CONFIG[currentRole].icon
                  return (
                    <tr key={member.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-3 px-4">
                        <Link 
                          to={`/admin/members/${member.discord_id}`}
                          className="flex items-center gap-3 hover:text-theme-light transition-colors"
                        >
                          {member.discord_avatar ? (
                            <img 
                              src={member.discord_avatar} 
                              alt={member.discord_username || 'Avatar'}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-theme/20 flex items-center justify-center">
                              <User size={20} className="text-theme-light" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{member.discord_username || member.game_id}</p>
                            <p className="text-xs text-gray-500">{member.discord_id}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4">{member.game_id}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${ROLE_CONFIG[currentRole].color}`}>
                          <RoleIcon size={16} />
                          {ROLE_CONFIG[currentRole].label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={currentRole}
                          onChange={(e) => updateRole(member, e.target.value as UserRole)}
                          className="input-field text-sm"
                        >
                          {(Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => (
                            <option key={role} value={role}>{ROLE_CONFIG[role].label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filteredMembers.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No members found
              </div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredMembers.map((member) => {
              const currentRole = member.role || 'member'
              const RoleIcon = ROLE_CONFIG[currentRole].icon
              return (
                <div key={member.id} className="card">
                  <Link 
                    to={`/admin/members/${member.discord_id}`}
                    className="flex items-center gap-3 mb-4"
                  >
                    {member.discord_avatar ? (
                      <img 
                        src={member.discord_avatar} 
                        alt={member.discord_username || 'Avatar'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-theme/20 flex items-center justify-center">
                        <User size={24} className="text-theme-light" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-theme-light">{member.discord_username || member.game_id}</p>
                      <p className="text-sm text-gray-400">{member.game_id}</p>
                    </div>
                  </Link>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Current Role</label>
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${ROLE_CONFIG[currentRole].color}`}>
                        <RoleIcon size={16} />
                        {ROLE_CONFIG[currentRole].label}
                      </span>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Change Role</label>
                      <select
                        value={currentRole}
                        onChange={(e) => updateRole(member, e.target.value as UserRole)}
                        className="input-field w-full"
                      >
                        {(Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => (
                          <option key={role} value={role}>{ROLE_CONFIG[role].label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}

            {filteredMembers.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No members found
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  )
}
