import { useState, useEffect } from 'react'
import { Layout } from '../../components/Layout'
import { api } from '../../lib/api'
import { useSettings } from '../../context/SettingsContext'
import { useTheme, ThemeColor } from '../../context/ThemeContext'
import { Settings, Bell, Shield, Database, Globe, Save, Loader, CheckCircle, AlertTriangle, MapPin, Wifi, Eye, Link, Smartphone, Clock, ShieldAlert, Palette } from 'lucide-react'

const THEME_COLORS: { value: ThemeColor; label: string; color: string }[] = [
  { value: 'amber', label: 'Gold', color: 'bg-amber-500' },
  { value: 'blue', label: 'Blue', color: 'bg-blue-500' },
  { value: 'green', label: 'Green', color: 'bg-green-500' },
  { value: 'purple', label: 'Purple', color: 'bg-purple-500' },
  { value: 'red', label: 'Red', color: 'bg-red-500' },
  { value: 'pink', label: 'Pink', color: 'bg-pink-500' },
  { value: 'cyan', label: 'Cyan', color: 'bg-cyan-500' },
]

export function SettingsPage() {
  const { refreshSettings } = useSettings()
  const { themeColor, setThemeColor } = useTheme()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [settings, setSettings] = useState({
    siteName: 'Arena Run',
    siteDescription: 'Private Video Platform',
    requireRole: true,
    allowNewMembers: true,
    maxSessionsPerUser: 5,
    sessionTimeout: 30,
    // Notification settings
    notifyCountryChange: true,
    notifyIpChange: true,
    notifyExcessiveViews: true,
    excessiveViewsThreshold: 5,
    excessiveViewsInterval: 10,
    notifySuspiciousActivity: true,
    notifyVpnProxy: true,
    notifyMultipleDevices: true,
    notifyOddHours: false,
    oddHoursStart: 2,
    oddHoursEnd: 6,
    webhookSecurity: '',
    webhookAlerts: '',
    webhookUploads: '',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const result = await api.getSettings()
      if (result.settings) {
        setSettings({
          siteName: result.settings.site_name || 'Arena Run',
          siteDescription: result.settings.site_description || 'Private Video Platform',
          requireRole: result.settings.require_role ?? true,
          allowNewMembers: result.settings.allow_new_members ?? true,
          maxSessionsPerUser: result.settings.max_sessions_per_user || 5,
          sessionTimeout: result.settings.session_timeout || 30,
          // Notification settings
          notifyCountryChange: result.settings.notify_country_change ?? true,
          notifyIpChange: result.settings.notify_ip_change ?? true,
          notifyExcessiveViews: result.settings.notify_excessive_views ?? true,
          excessiveViewsThreshold: result.settings.excessive_views_threshold || 5,
          excessiveViewsInterval: result.settings.excessive_views_interval || 10,
          notifySuspiciousActivity: result.settings.notify_suspicious_activity ?? true,
          notifyVpnProxy: result.settings.notify_vpn_proxy ?? true,
          notifyMultipleDevices: result.settings.notify_multiple_devices ?? true,
          notifyOddHours: result.settings.notify_odd_hours ?? false,
          oddHoursStart: result.settings.odd_hours_start ?? 2,
          oddHoursEnd: result.settings.odd_hours_end ?? 6,
          webhookSecurity: result.settings.webhook_security || '',
          webhookAlerts: result.settings.webhook_alerts || '',
          webhookUploads: result.settings.webhook_uploads || '',
        })
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage('')
    try {
      await api.saveSettings(settings)
      await refreshSettings() // Update global settings context
      setSaveMessage('Settings saved successfully!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error: any) {
      console.error('Failed to save settings:', error)
      setSaveMessage(`Failed to save: ${error.message || 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400">Configure platform settings and preferences</p>
      </div>

      {saveMessage && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          saveMessage.includes('success') 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          <CheckCircle size={20} />
          {saveMessage}
        </div>
      )}

      <div className="max-w-3xl space-y-6">
        {/* General Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="text-theme-light" size={24} />
            <h2 className="text-xl font-bold text-theme-light">General Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Site Name</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Site Description</label>
              <input
                type="text"
                value={settings.siteDescription}
                onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                className="input-field w-full"
              />
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="text-theme-light" size={24} />
            <h2 className="text-xl font-bold text-theme-light">Theme Color</h2>
          </div>
          
          <div className="grid grid-cols-7 gap-3">
            {THEME_COLORS.map((theme) => (
              <button
                key={theme.value}
                onClick={() => setThemeColor(theme.value)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  themeColor === theme.value
                    ? 'border-white bg-gray-700'
                    : 'border-transparent hover:bg-gray-700/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full ${theme.color}`} />
                <span className="text-xs">{theme.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">Theme changes are saved automatically</p>
        </div>

        {/* Security Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-theme-light" size={24} />
            <h2 className="text-xl font-bold text-theme-light">Security Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Require Discord Role</p>
                <p className="text-sm text-gray-400">Only allow members with specific Discord role</p>
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
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Allow New Members</p>
                <p className="text-sm text-gray-400">Allow new Discord users to register</p>
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
            <h2 className="text-xl font-bold text-theme-light">Session Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Max Sessions Per User</label>
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
              <label className="block text-sm text-gray-400 mb-2">Session Timeout (minutes)</label>
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
            <h2 className="text-xl font-bold text-theme-light">Notifications</h2>
          </div>
          
          <div className="space-y-4">
            {/* Country Change */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="text-orange-400" size={18} />
                <div>
                  <p className="font-medium">Country Change Alert</p>
                  <p className="text-sm text-gray-400">Notify when a user's country changes</p>
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
                  <p className="font-medium">IP Change Alert</p>
                  <p className="text-sm text-gray-400">Notify when a user's IP address changes</p>
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
                  <p className="font-medium">Excessive Views Alert</p>
                  <p className="text-sm text-gray-400">Notify when a user watches the same video too many times</p>
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
                  <label className="block text-sm text-gray-400 mb-2">First Alert After (views in 24h)</label>
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
                  <label className="block text-sm text-gray-400 mb-2">Then Alert Every (views)</label>
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
                  <p className="font-medium">Suspicious Activity Alert</p>
                  <p className="text-sm text-gray-400">Master toggle for all suspicious activity alerts below</p>
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
                      <p className="font-medium text-sm">VPN/Proxy Detection</p>
                      <p className="text-xs text-gray-400">Alert when user connects via VPN or Proxy</p>
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
                      <p className="font-medium text-sm">Multiple Devices</p>
                      <p className="text-xs text-gray-400">Alert when user watches from multiple devices simultaneously</p>
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
                      <p className="font-medium text-sm">Odd Hours Activity</p>
                      <p className="text-xs text-gray-400">Alert when user watches during unusual hours</p>
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
                    <label className="block text-xs text-gray-400 mb-2">Odd Hours Range (UTC)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.oddHoursStart}
                        onChange={(e) => setSettings({ ...settings, oddHoursStart: parseInt(e.target.value) || 0 })}
                        className="input-field w-16 text-sm"
                        min="0"
                        max="23"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="number"
                        value={settings.oddHoursEnd}
                        onChange={(e) => setSettings({ ...settings, oddHoursEnd: parseInt(e.target.value) || 0 })}
                        className="input-field w-16 text-sm"
                        min="0"
                        max="23"
                      />
                      <span className="text-gray-500 text-xs">(24h format)</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Webhook URLs */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Link className="text-theme-light" size={24} />
            <h2 className="text-xl font-bold text-theme-light">Discord Webhooks</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">Configure Discord webhook URLs for notifications. Leave empty to use environment variables.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                <span className="flex items-center gap-2">
                  <Shield className="text-red-400" size={14} />
                  Security Alerts Webhook
                </span>
              </label>
              <input
                type="url"
                value={settings.webhookSecurity}
                onChange={(e) => setSettings({ ...settings, webhookSecurity: e.target.value })}
                className="input-field w-full"
                placeholder="https://discord.com/api/webhooks/..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                <span className="flex items-center gap-2">
                  <Bell className="text-yellow-400" size={14} />
                  General Alerts Webhook
                </span>
              </label>
              <input
                type="url"
                value={settings.webhookAlerts}
                onChange={(e) => setSettings({ ...settings, webhookAlerts: e.target.value })}
                className="input-field w-full"
                placeholder="https://discord.com/api/webhooks/..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                <span className="flex items-center gap-2">
                  <Globe className="text-green-400" size={14} />
                  Uploads Webhook
                </span>
              </label>
              <input
                type="url"
                value={settings.webhookUploads}
                onChange={(e) => setSettings({ ...settings, webhookUploads: e.target.value })}
                className="input-field w-full"
                placeholder="https://discord.com/api/webhooks/..."
              />
            </div>
          </div>
        </div>

        {/* API Info */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="text-theme-light" size={24} />
            <h2 className="text-xl font-bold text-theme-light">API Configuration</h2>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Supabase</span>
              <span className="text-green-400">Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Cloudflare Stream</span>
              <span className="text-green-400">Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Discord OAuth</span>
              <span className="text-green-400">Connected</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
