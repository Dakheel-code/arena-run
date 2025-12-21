import { useState, useEffect } from 'react'
import { Layout } from '../../components/Layout'
import { api } from '../../lib/api'
import { useSettings } from '../../context/SettingsContext'
import { useTheme, ThemeColor } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { Member, UserRole } from '../../types'
import { Bell, Shield, Database, Globe, Loader, CheckCircle, AlertTriangle, MapPin, Wifi, Eye, Smartphone, Clock, ShieldAlert, Palette, Upload, Plus, X, Download, HardDrive, Zap, Image, Code, Crown, Edit3, Users, User, Settings } from 'lucide-react'

const THEME_COLORS: { value: ThemeColor; label: string; color: string }[] = [
  { value: 'amber', label: 'Gold', color: 'bg-amber-500' },
  { value: 'blue', label: 'Blue', color: 'bg-blue-500' },
  { value: 'green', label: 'Green', color: 'bg-green-500' },
  { value: 'purple', label: 'Purple', color: 'bg-purple-500' },
  { value: 'red', label: 'Red', color: 'bg-red-500' },
  { value: 'pink', label: 'Pink', color: 'bg-pink-500' },
  { value: 'cyan', label: 'Cyan', color: 'bg-cyan-500' },
]

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: any; description: string }> = {
  super_admin: {
    label: 'Super Admin',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: Crown,
    description: 'Full system access'
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

export function SettingsPage() {
  const { t } = useLanguage()
  const { refreshSettings } = useSettings()
  const { themeColor, setThemeColor, themeMode, setThemeMode } = useTheme()
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [showSaveNotification, setShowSaveNotification] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [newServerId, setNewServerId] = useState('')
  const [serverIds, setServerIds] = useState<string[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [settings, setSettings] = useState({
    siteName: 'The Regulators RGR',
    siteDescription: 'Arena Run',
    discordGuildIds: '',
    requireRole: true,
    allowedRoles: '',
    allowNewMembers: true,
    maxSessionsPerUser: 5,
    sessionTimeout: 30,
    // Notification settings
    notifyCountryChange: true,
    notifyIpChange: true,
    notifyUnauthorizedLogin: true,
    notifyExcessiveViews: true,
    excessiveViewsThreshold: 5,
    excessiveViewsInterval: 10,
    notifySuspiciousActivity: true,
    notifyVpnProxy: true,
    notifyMultipleDevices: true,
    notifyOddHours: false,
    oddHoursStart: 2,
    oddHoursEnd: 6,
    notifyNewUpload: true,
    notifyNewPublish: true,
    notifyNewSession: true,
    webhookUrl: '',
    // Backup settings
    autoBackup: false,
    backupFrequency: 'daily',
    backupRetention: 7,
    // Performance settings
    enableCaching: true,
    cacheDuration: 3600,
    enableImageOptimization: true,
    enableLazyLoading: true,
    enableMinification: true,
    compressionLevel: 'medium',
  })

  useEffect(() => {
    fetchSettings()
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      setIsLoadingMembers(true)
      const result = await api.getMembers()
      setMembers(result.members || [])
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const updateRole = async (member: Member, newRole: UserRole) => {
    try {
      const result = await api.updateMemberRole(member.discord_id, newRole)
      console.log('Update role result:', result)
      
      setMembers((prev) =>
        prev.map((m) => (m.discord_id === member.discord_id ? { ...m, role: newRole } : m))
      )
      if (selectedMember && selectedMember.discord_id === member.discord_id) {
        setSelectedMember({ ...selectedMember, role: newRole })
      }
      
      // Show success notification
      setShowSaveNotification(true)
      setTimeout(() => setShowSaveNotification(false), 3000)
    } catch (error: any) {
      console.error('Failed to update role:', error)
      const errorMessage = error?.message || 'Failed to update role. Please try again.'
      alert(errorMessage)
    }
  }

  const handleSearchChange = async (value: string) => {
    setSearchQuery(value)
    setSelectedMember(null)
    
    if (!value.trim()) {
      setSearchResults([])
      setShowSuggestions(false)
      return
    }

    setIsLoadingMembers(true)
    try {
      let allMembers = members
      if (members.length === 0) {
        const result = await api.getMembers()
        allMembers = result.members || []
        setMembers(allMembers)
      }
      
      const filtered = allMembers.filter(m => 
        m.discord_username?.toLowerCase().includes(value.toLowerCase()) ||
        m.game_id.toLowerCase().includes(value.toLowerCase()) ||
        m.discord_id.includes(value)
      ).slice(0, 10)
      
      setSearchResults(filtered)
      setShowSuggestions(filtered.length > 0)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member)
    setSearchQuery(member.discord_username || member.game_id)
    setShowSuggestions(false)
  }

  const fetchSettings = async () => {
    try {
      const result = await api.getSettings()
      console.log('Fetched settings from API:', result.settings)
      if (result.settings) {
        // Parse roles from comma-separated string
        const rolesString = (result.settings as any).allowed_roles || ''
        setRoles(rolesString ? rolesString.split(',').map((r: string) => r.trim()).filter(Boolean) : [])
        
        // Parse server IDs from comma-separated string
        const serverIdsString = (result.settings as any).discord_guild_ids || ''
        setServerIds(serverIdsString ? serverIdsString.split(',').map((id: string) => id.trim()).filter(Boolean) : [])
        
        const webhookUrl = (result.settings as any).webhook_url || ''
        console.log('Webhook URL from DB:', webhookUrl)
        
        setSettings({
          siteName: result.settings.site_name || 'The Regulators RGR',
          siteDescription: result.settings.site_description || 'Arena Run',
          discordGuildIds: serverIdsString,
          requireRole: result.settings.require_role ?? true,
          allowedRoles: rolesString,
          allowNewMembers: result.settings.allow_new_members ?? true,
          maxSessionsPerUser: result.settings.max_sessions_per_user || 5,
          sessionTimeout: result.settings.session_timeout || 30,
          // Notification settings
          notifyCountryChange: result.settings.notify_country_change ?? true,
          notifyIpChange: result.settings.notify_ip_change ?? true,
          notifyUnauthorizedLogin: result.settings.notify_unauthorized_login ?? true,
          notifyExcessiveViews: result.settings.notify_excessive_views ?? true,
          excessiveViewsThreshold: result.settings.excessive_views_threshold || 5,
          excessiveViewsInterval: result.settings.excessive_views_interval || 10,
          notifySuspiciousActivity: result.settings.notify_suspicious_activity ?? true,
          notifyVpnProxy: result.settings.notify_vpn_proxy ?? true,
          notifyMultipleDevices: result.settings.notify_multiple_devices ?? true,
          notifyOddHours: result.settings.notify_odd_hours ?? false,
          oddHoursStart: result.settings.odd_hours_start ?? 2,
          oddHoursEnd: result.settings.odd_hours_end ?? 6,
          notifyNewUpload: (result.settings as any).notify_new_upload ?? true,
          notifyNewPublish: (result.settings as any).notify_new_publish ?? true,
          notifyNewSession: (result.settings as any).notify_new_session ?? true,
          webhookUrl: webhookUrl,
          // Backup settings
          autoBackup: (result.settings as any).auto_backup ?? false,
          backupFrequency: (result.settings as any).backup_frequency || 'daily',
          backupRetention: (result.settings as any).backup_retention || 7,
          // Performance settings
          enableCaching: (result.settings as any).enable_caching ?? true,
          cacheDuration: (result.settings as any).cache_duration || 3600,
          enableImageOptimization: (result.settings as any).enable_image_optimization ?? true,
          enableLazyLoading: (result.settings as any).enable_lazy_loading ?? true,
          enableMinification: (result.settings as any).enable_minification ?? true,
          compressionLevel: (result.settings as any).compression_level || 'medium',
        })
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setIsLoading(false)
      // Mark initial load as complete after settings are loaded
      setTimeout(() => setIsInitialLoad(false), 100)
    }
  }

  // Auto-save settings whenever they change (but not on initial load)
  useEffect(() => {
    // Skip if still loading or if this is the initial load
    if (isLoading || isInitialLoad) {
      return
    }
    
    console.log('Auto-saving settings...', settings)
    const saveSettings = async () => {
      try {
        await api.saveSettings({
          siteName: settings.siteName,
          siteDescription: settings.siteDescription,
          discordGuildIds: serverIds.join(','),
          requireRole: settings.requireRole,
          allowNewMembers: settings.allowNewMembers,
          maxSessionsPerUser: settings.maxSessionsPerUser,
          sessionTimeout: settings.sessionTimeout,
          notifyCountryChange: settings.notifyCountryChange,
          notifyIpChange: settings.notifyIpChange,
          notifyUnauthorizedLogin: settings.notifyUnauthorizedLogin,
          notifyExcessiveViews: settings.notifyExcessiveViews,
          excessiveViewsThreshold: settings.excessiveViewsThreshold,
          excessiveViewsInterval: settings.excessiveViewsInterval,
          notifySuspiciousActivity: settings.notifySuspiciousActivity,
          notifyVpnProxy: settings.notifyVpnProxy,
          notifyMultipleDevices: settings.notifyMultipleDevices,
          notifyOddHours: settings.notifyOddHours,
          oddHoursStart: settings.oddHoursStart,
          oddHoursEnd: settings.oddHoursEnd,
          notifyNewUpload: settings.notifyNewUpload,
          notifyNewPublish: settings.notifyNewPublish,
          notifyNewSession: settings.notifyNewSession,
          allowedRoles: settings.allowedRoles,
          webhookUrl: settings.webhookUrl,
        })
        await refreshSettings()
        console.log('Settings saved successfully')
        
        // Show save notification
        setShowSaveNotification(true)
        setTimeout(() => setShowSaveNotification(false), 3000)
      } catch (error) {
        console.error('Failed to auto-save settings:', error)
      }
    }
    const timeoutId = setTimeout(saveSettings, 1000) // Debounce 1 second
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  const addRole = () => {
    if (newRole.trim() && !roles.includes(newRole.trim())) {
      const updatedRoles = [...roles, newRole.trim()]
      setRoles(updatedRoles)
      setSettings({ ...settings, allowedRoles: updatedRoles.join(', ') })
      setNewRole('')
    }
  }

  const removeRole = (roleToRemove: string) => {
    setRoles(roles.filter(r => r !== roleToRemove))
    const newRoles = roles.filter(r => r !== roleToRemove)
    setSettings({ ...settings, allowedRoles: newRoles.join(',') })
  }

  const addServerId = () => {
    if (newServerId.trim() && !serverIds.includes(newServerId.trim())) {
      const updatedServerIds = [...serverIds, newServerId.trim()]
      setServerIds(updatedServerIds)
      setSettings({ ...settings, discordGuildIds: updatedServerIds.join(',') })
      setNewServerId('')
    }
  }

  const removeServerId = (idToRemove: string) => {
    const updatedServerIds = serverIds.filter(id => id !== idToRemove)
    setServerIds(updatedServerIds)
    setSettings({ ...settings, discordGuildIds: updatedServerIds.join(',') })
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader className="animate-spin text-discord-primary" size={48} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Save Notification */}
      {showSaveNotification && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:right-4 z-50 animate-fade-in-up">
          <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 sm:gap-3 max-w-sm mx-auto sm:mx-0">
            <CheckCircle className="flex-shrink-0" size={20} />
            <span className="font-medium text-sm sm:text-base">Settings saved successfully</span>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8 text-theme" />
          <h1 className="text-3xl font-bold text-theme">{t('settingsTitle')}</h1>
        </div>
        <p className="text-gray-400">{t('settingsSubtitle')}</p>
      </div>


      <div className="space-y-6">
        {/* Theme Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="text-theme-light" size={24} />
            <h2 className="text-xl font-bold text-theme-light">{t('themeColor')}</h2>
          </div>
          
          <div className="space-y-6">
            {/* Theme Color Selection */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Theme Color</h3>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {THEME_COLORS.map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => setThemeColor(theme.value)}
                    className={`w-12 h-12 rounded-full ${theme.color} transition-all ${
                      themeColor === theme.value
                        ? 'ring-4 ring-white ring-offset-2 ring-offset-discord-dark scale-110'
                        : 'hover:scale-105'
                    }`}
                    title={theme.label}
                  />
                ))}
              </div>
            </div>

            {/* Dark/Light Mode Toggle */}
            <div className="pt-4 border-t border-gray-700">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Appearance Mode</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setThemeMode('dark')}
                  className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    themeMode === 'dark'
                      ? 'border-white bg-gray-700' 
                      : 'border-transparent hover:bg-gray-700/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-gray-600"></div>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Dark Mode</p>
                    <p className="text-xs text-gray-400">{themeMode === 'dark' ? 'Currently Active' : 'Click to activate'}</p>
                  </div>
                </button>
                
                <button
                  onClick={() => setThemeMode('light')}
                  className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    themeMode === 'light'
                      ? 'border-white bg-gray-700' 
                      : 'border-transparent hover:bg-gray-700/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-yellow-400"></div>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Light Mode</p>
                    <p className="text-xs text-gray-400">{themeMode === 'light' ? 'Currently Active' : 'Click to activate'}</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-theme-light" size={24} />
            <h2 className="text-xl font-bold text-theme-light">{t('securitySettings')}</h2>
          </div>
          
          <div className="space-y-4">
            {/* Discord Server IDs */}
            <div>
              <label className="block font-medium mb-2">Discord Server IDs</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newServerId}
                  onChange={(e) => setNewServerId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addServerId()}
                  placeholder="Enter Discord Server (Guild) ID"
                  className="input-field flex-1 font-mono"
                />
                <button
                  onClick={addServerId}
                  className="btn-discord px-4"
                >
                  <Plus size={18} />
                </button>
              </div>
              {serverIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {serverIds.map((serverId) => (
                    <div
                      key={serverId}
                      className="flex items-center gap-2 bg-theme/20 text-theme-light px-3 py-1.5 rounded-lg border border-theme/30 font-mono"
                    >
                      <span className="text-sm font-medium">{serverId}</span>
                      <button
                        onClick={() => removeServerId(serverId)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-400 mt-2">
                Add Discord server IDs one by one. Members must be present in at least one of these servers to access the site.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('requireDiscordRole')}</p>
                <p className="text-sm text-gray-400">{t('requireDiscordRoleDesc')}</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, requireRole: !settings.requireRole })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.requireRole ? 'bg-theme' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.requireRole ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {settings.requireRole && (
              <div>
                <label className="block font-medium mb-2">Allowed Discord Roles</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addRole()}
                    placeholder="Enter role name"
                    className="input-field flex-1"
                  />
                  <button
                    onClick={addRole}
                    className="btn-discord px-4"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {roles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {roles.map((role) => (
                      <div
                        key={role}
                        className="flex items-center gap-2 bg-theme/20 text-theme-light px-3 py-1.5 rounded-lg border border-theme/30"
                      >
                        <span className="text-sm font-medium">{role}</span>
                        <button
                          onClick={() => removeRole(role)}
                          className="hover:text-red-400 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-400 mt-2">Add role names one by one. Leave empty to allow all roles.</p>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('allowNewMembers')}</p>
                <p className="text-sm text-gray-400">{t('allowNewMembersDesc')}</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, allowNewMembers: !settings.allowNewMembers })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.allowNewMembers ? 'bg-theme' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.allowNewMembers ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Session Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Database className="text-theme-light" size={24} />
            <h2 className="text-xl font-bold text-theme-light">{t('sessionSettings')}</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('maxSessionsPerUser')}</label>
              <input
                type="number"
                value={settings.maxSessionsPerUser}
                onChange={(e) => setSettings({ ...settings, maxSessionsPerUser: parseInt(e.target.value) })}
                className="input-field w-32"
                min="1"
                max="10"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('sessionTimeoutMinutes')}</label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                className="input-field w-32"
                min="5"
                max="120"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="text-theme-light" size={24} />
            <h2 className="text-xl font-bold text-theme-light">{t('notifications')}</h2>
          </div>
          
          <div className="space-y-6">
            {/* Content Activity Notifications */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Upload size={16} className="text-green-400" />
                Content Activity
              </h3>
              
              {/* New Upload Alert */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Upload className="text-green-400" size={18} />
                  <div>
                    <p className="font-medium">New Video Upload</p>
                    <p className="text-sm text-gray-400">Get notified when a new video is uploaded</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, notifyNewUpload: !settings.notifyNewUpload })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.notifyNewUpload ? 'bg-theme' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.notifyNewUpload ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* New Publish Alert */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-cyan-400" size={18} />
                  <div>
                    <p className="font-medium">New Video Published</p>
                    <p className="text-sm text-gray-400">Get notified when a video is published</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, notifyNewPublish: !settings.notifyNewPublish })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.notifyNewPublish ? 'bg-theme' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.notifyNewPublish ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* New Session Alert */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="text-pink-400" size={18} />
                  <div>
                    <p className="font-medium">New Watch Session</p>
                    <p className="text-sm text-gray-400">Get notified when a new watch session starts</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, notifyNewSession: !settings.notifyNewSession })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.notifyNewSession ? 'bg-theme' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.notifyNewSession ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-700"></div>

            {/* Security Alerts */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <ShieldAlert size={16} className="text-red-400" />
                Security Alerts
              </h3>

              {/* Unauthorized Login Alert */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-red-400" size={18} />
                  <div>
                    <p className="font-medium">Unauthorized Login Attempt</p>
                    <p className="text-sm text-gray-400">Get notified when someone tries to login without permission</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, notifyUnauthorizedLogin: !settings.notifyUnauthorizedLogin })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.notifyUnauthorizedLogin ? 'bg-theme' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.notifyUnauthorizedLogin ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Country Change */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="text-orange-400" size={18} />
                  <div>
                    <p className="font-medium">{t('countryChangeAlert')}</p>
                    <p className="text-sm text-gray-400">{t('countryChangeAlertDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, notifyCountryChange: !settings.notifyCountryChange })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.notifyCountryChange ? 'bg-theme' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.notifyCountryChange ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* IP Change */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wifi className="text-blue-400" size={18} />
                  <div>
                    <p className="font-medium">{t('ipChangeAlert')}</p>
                    <p className="text-sm text-gray-400">{t('ipChangeAlertDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, notifyIpChange: !settings.notifyIpChange })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.notifyIpChange ? 'bg-theme' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.notifyIpChange ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Excessive Views */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="text-purple-400" size={18} />
                  <div>
                    <p className="font-medium">{t('excessiveViewsAlert')}</p>
                    <p className="text-sm text-gray-400">{t('excessiveViewsAlertDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, notifyExcessiveViews: !settings.notifyExcessiveViews })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.notifyExcessiveViews ? 'bg-theme' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.notifyExcessiveViews ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Excessive Views Threshold & Interval */}
              {settings.notifyExcessiveViews && (
                <div className="ml-9 pl-3 border-l-2 border-gray-700 space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">{t('firstAlertAfter')}</label>
                    <input
                      type="number"
                      value={settings.excessiveViewsThreshold}
                      onChange={(e) => setSettings({ ...settings, excessiveViewsThreshold: parseInt(e.target.value) || 5 })}
                      className="input-field w-24"
                      min="2"
                      max="50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">{t('thenAlertEvery')}</label>
                    <input
                      type="number"
                      value={settings.excessiveViewsInterval}
                      onChange={(e) => setSettings({ ...settings, excessiveViewsInterval: parseInt(e.target.value) || 10 })}
                      className="input-field w-24"
                      min="1"
                      max="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Alerts at: {settings.excessiveViewsThreshold}, {settings.excessiveViewsThreshold + settings.excessiveViewsInterval}, {settings.excessiveViewsThreshold + (settings.excessiveViewsInterval * 2)}...
                    </p>
                  </div>
                </div>
              )}

              {/* Suspicious Activity */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-red-400" size={18} />
                  <div>
                    <p className="font-medium">{t('suspiciousActivityAlert')}</p>
                    <p className="text-sm text-gray-400">{t('suspiciousActivityAlertDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, notifySuspiciousActivity: !settings.notifySuspiciousActivity })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.notifySuspiciousActivity ? 'bg-theme' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.notifySuspiciousActivity ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Sub-options for Suspicious Activity */}
              {settings.notifySuspiciousActivity && (
                <div className="ml-9 pl-3 border-l-2 border-gray-700 space-y-4">
                  {/* VPN/Proxy Detection */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="text-red-500" size={16} />
                      <div>
                        <p className="font-medium text-sm">{t('vpnProxyDetection')}</p>
                        <p className="text-xs text-gray-400">{t('vpnProxyDetectionDesc')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, notifyVpnProxy: !settings.notifyVpnProxy })}
                      className={`w-10 h-5 rounded-full transition-colors ${
                        settings.notifyVpnProxy ? 'bg-theme' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.notifyVpnProxy ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Multiple Devices */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="text-orange-500" size={16} />
                      <div>
                        <p className="font-medium text-sm">{t('multipleDevices')}</p>
                        <p className="text-xs text-gray-400">{t('multipleDevicesDesc')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, notifyMultipleDevices: !settings.notifyMultipleDevices })}
                      className={`w-10 h-5 rounded-full transition-colors ${
                        settings.notifyMultipleDevices ? 'bg-theme' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.notifyMultipleDevices ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Odd Hours Activity */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="text-purple-500" size={16} />
                      <div>
                        <p className="font-medium text-sm">{t('oddHoursActivity')}</p>
                        <p className="text-xs text-gray-400">{t('oddHoursActivityDesc')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, notifyOddHours: !settings.notifyOddHours })}
                      className={`w-10 h-5 rounded-full transition-colors ${
                        settings.notifyOddHours ? 'bg-theme' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.notifyOddHours ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Odd Hours Time Range */}
                  {settings.notifyOddHours && (
                    <div className="ml-7 pl-3 border-l-2 border-gray-600">
                      <label className="block text-xs text-gray-400 mb-2">{t('oddHoursRange')}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={settings.oddHoursStart}
                          onChange={(e) => setSettings({ ...settings, oddHoursStart: parseInt(e.target.value) || 0 })}
                          className="input-field w-16 text-sm"
                          min="0"
                          max="23"
                        />
                        <span className="text-gray-400">{t('toText')}</span>
                        <input
                          type="number"
                          value={settings.oddHoursEnd}
                          onChange={(e) => setSettings({ ...settings, oddHoursEnd: parseInt(e.target.value) || 0 })}
                          className="input-field w-16 text-sm"
                          min="0"
                          max="23"
                        />
                        <span className="text-gray-500 text-xs">{t('format24h')}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Permissions Management */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-theme-light" size={24} />
            <h2 className="text-xl font-bold text-theme-light">Permissions Management</h2>
          </div>

          {/* Search Bar with Autocomplete */}
          <div className="mb-6 relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, game ID, or Discord ID..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSuggestions(true)}
                className="input-field w-full pr-10"
              />
              <Eye className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>

            {/* Autocomplete Suggestions */}
            {showSuggestions && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {searchResults.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleSelectMember(member)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 transition-colors text-left"
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
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.discord_username || member.game_id}</p>
                      <p className="text-xs text-gray-500 truncate">{member.game_id}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Member */}
          {selectedMember ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                {selectedMember.discord_avatar ? (
                  <img 
                    src={selectedMember.discord_avatar} 
                    alt={selectedMember.discord_username || 'Avatar'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-theme/20 flex items-center justify-center">
                    <User size={20} className="text-theme-light" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedMember.discord_username || selectedMember.game_id}</p>
                  <p className="text-xs text-gray-500 truncate">{selectedMember.game_id}</p>
                  {selectedMember.role_assigned_by_name && (
                    <p className="text-xs text-theme/70 truncate mt-0.5">
                      Role assigned as: {selectedMember.role_assigned_by_name}
                      {selectedMember.role_assigned_at && (
                        <span className="text-gray-600 ml-1">
                          ({new Date(selectedMember.role_assigned_at).toLocaleDateString()})
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const currentRole = selectedMember.role || 'member'
                    const RoleIcon = ROLE_CONFIG[currentRole].icon
                    return (
                      <>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${ROLE_CONFIG[currentRole].color}`}>
                          <RoleIcon size={14} />
                          {ROLE_CONFIG[currentRole].label}
                        </span>
                        <select
                          value={currentRole}
                          onChange={(e) => updateRole(selectedMember, e.target.value as UserRole)}
                          className="input-field text-xs py-1 px-2"
                        >
                          {(Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => (
                            <option key={role} value={role}>{ROLE_CONFIG[role].label}</option>
                          ))}
                        </select>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          ) : isLoadingMembers ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="animate-spin text-theme-light" size={32} />
            </div>
          ) : searchQuery && searchResults.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No members found matching "{searchQuery}"</p>
            </div>
          ) : null}

          {/* Members with Roles List */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Users size={16} className="text-theme-light" />
              Members with Assigned Roles
            </h3>
            {members.filter(m => m.role && m.role !== 'member').length > 0 ? (
              <div className="space-y-2">
                {members
                  .filter(m => m.role && m.role !== 'member')
                  .sort((a, b) => {
                    const roleOrder = { super_admin: 0, admin: 1, editor: 2, member: 3 }
                    return roleOrder[a.role || 'member'] - roleOrder[b.role || 'member']
                  })
                  .map((member) => {
                    const currentRole = member.role || 'member'
                    const RoleIcon = ROLE_CONFIG[currentRole].icon
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer"
                        onClick={() => handleSelectMember(member)}
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
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.discord_username || member.game_id}</p>
                          <p className="text-xs text-gray-500 truncate">{member.game_id}</p>
                          {member.role_assigned_by_name && (
                            <p className="text-xs text-theme/60 truncate mt-0.5">
                              Assigned as: {member.role_assigned_by_name}
                            </p>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${ROLE_CONFIG[currentRole].color}`}>
                          <RoleIcon size={14} />
                          {ROLE_CONFIG[currentRole].label}
                        </span>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-4">No members with assigned roles yet</p>
            )}
          </div>
        </div>

        {/* Backup & Restore - Hidden (not functional) */}
        <div className="card" style={{ display: 'none' }}>
          <div className="flex items-center gap-3 mb-6">
            <HardDrive className="text-theme-light" size={24} />
            <h2 className="text-xl font-bold text-theme-light">Backup & Restore</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto Backup</p>
                <p className="text-sm text-gray-400">Automatically backup database on schedule</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, autoBackup: !settings.autoBackup })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.autoBackup ? 'bg-theme' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.autoBackup ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {settings.autoBackup && (
              <div className="ml-9 pl-3 border-l-2 border-gray-700 space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Backup Frequency</label>
                  <select
                    value={settings.backupFrequency}
                    onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
                    className="input-field w-48"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Retention Period (days)</label>
                  <input
                    type="number"
                    value={settings.backupRetention}
                    onChange={(e) => setSettings({ ...settings, backupRetention: parseInt(e.target.value) || 7 })}
                    className="input-field w-32"
                    min="1"
                    max="365"
                  />
                  <p className="text-xs text-gray-500 mt-1">Backups older than this will be deleted</p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-700">
              <div className="flex gap-3">
                <button
                  onClick={() => alert('Manual backup started!')}
                  className="btn-discord flex items-center gap-2"
                >
                  <Download size={18} />
                  Backup Now
                </button>
                <button
                  onClick={() => alert('Restore functionality coming soon!')}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Upload size={18} />
                  Restore
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Last backup: Never â€¢ Next backup: {settings.autoBackup ? 'Scheduled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>

        {/* Performance Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="text-theme-light" size={24} />
            <h2 className="text-xl font-bold text-theme-light">Performance Settings</h2>
          </div>
          
          <div className="space-y-4">
            {/* Enable Caching */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="text-blue-400" size={18} />
                <div>
                  <p className="font-medium">Enable Caching</p>
                  <p className="text-sm text-gray-400">Cache API responses for faster loading</p>
                </div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, enableCaching: !settings.enableCaching })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.enableCaching ? 'bg-theme' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.enableCaching ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {settings.enableCaching && (
              <div className="ml-9 pl-3 border-l-2 border-gray-700">
                <label className="block text-sm text-gray-400 mb-2">Cache Duration (seconds)</label>
                <input
                  type="number"
                  value={settings.cacheDuration}
                  onChange={(e) => setSettings({ ...settings, cacheDuration: parseInt(e.target.value) || 3600 })}
                  className="input-field w-32"
                  min="60"
                  max="86400"
                />
                <p className="text-xs text-gray-500 mt-1">3600s = 1 hour, 86400s = 24 hours</p>
              </div>
            )}

            {/* Image Optimization */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image className="text-green-400" size={18} />
                <div>
                  <p className="font-medium">Image Optimization</p>
                  <p className="text-sm text-gray-400">Optimize images for faster loading</p>
                </div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, enableImageOptimization: !settings.enableImageOptimization })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.enableImageOptimization ? 'bg-theme' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.enableImageOptimization ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Lazy Loading */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="text-purple-400" size={18} />
                <div>
                  <p className="font-medium">Lazy Loading</p>
                  <p className="text-sm text-gray-400">Load images only when visible</p>
                </div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, enableLazyLoading: !settings.enableLazyLoading })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.enableLazyLoading ? 'bg-theme' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.enableLazyLoading ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Minification */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Code className="text-cyan-400" size={18} />
                <div>
                  <p className="font-medium">Code Minification</p>
                  <p className="text-sm text-gray-400">Minify CSS and JavaScript files</p>
                </div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, enableMinification: !settings.enableMinification })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.enableMinification ? 'bg-theme' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.enableMinification ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Compression Level */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Compression Level</label>
              <select
                value={settings.compressionLevel}
                onChange={(e) => setSettings({ ...settings, compressionLevel: e.target.value })}
                className="input-field w-48"
              >
                <option value="none">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Higher compression = smaller files but more CPU usage</p>
            </div>
          </div>
        </div>

        {/* Discord Webhooks */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="text-theme-light" size={24} />
            <h2 className="text-xl font-bold text-theme-light">{t('discordWebhooks')}</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">{t('webhooksDesc')}</p>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              <span className="flex items-center gap-2">
                <Bell className="text-theme-light" size={14} />
                Discord Webhook URL
              </span>
            </label>
            <input
              type="url"
              value={settings.webhookUrl}
              onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
              className="input-field w-full"
              placeholder="https://discord.com/api/webhooks/..."
            />
            {settings.webhookUrl ? (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-green-400">
                  <CheckCircle size={14} />
                  <span>Webhook URL configured and connected</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-2">
                All notifications will be sent to this webhook URL
              </p>
            )}
          </div>
        </div>

        {/* API Info */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="text-theme-light" size={24} />
            <h2 className="text-xl font-bold text-theme-light">{t('apiConfiguration')}</h2>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Supabase</span>
              <span className="text-green-400">{t('connected')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Cloudflare Stream</span>
              <span className="text-green-400">{t('connected')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Discord OAuth</span>
              <span className="text-green-400">{t('connected')}</span>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}

