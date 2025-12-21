import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const ADMIN_IDS = (process.env.ADMIN_DISCORD_IDS || '').split(',').map(id => id.trim()).filter(Boolean)

function verifyToken(token: string): { discord_id: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    if (payload.exp && payload.exp < Date.now() / 1000) return null
    return payload
  } catch {
    return null
  }
}

function getUser(event: any): { discord_id: string } | null {
  const authHeader = event.headers.authorization || event.headers.Authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const payload = verifyToken(token)
  // Token uses discord_id not sub
  if (!payload?.discord_id) return null
  return { discord_id: payload.discord_id }
}

export const handler: Handler = async (event) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // GET - Fetch settings (public for basic settings)
    if (event.httpMethod === 'GET') {
      const isPublic = event.queryStringParameters?.public === 'true'
      
      // Public request - return only site name and description
      if (isPublic) {
        const { data, error } = await supabase
          .from('settings')
          .select('site_name, site_description')
          .single()

        const settings = data || {
          site_name: 'Arena Run',
          site_description: 'Private Video Platform',
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings }),
        }
      }
      
      // Admin request - require authentication
      const user = getUser(event)
      if (!user || !ADMIN_IDS.includes(user.discord_id)) {
        return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) }
      }
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) }
      }

      // Return default settings if none exist
      const settings = data || {
        site_name: 'The Regulators RGR',
        site_description: 'Arena Run',
        require_role: true,
        allowed_roles: '',
        allow_new_members: true,
        max_sessions_per_user: 5,
        session_timeout: 30,
        // Notification settings
        notify_country_change: true,
        notify_ip_change: true,
        notify_unauthorized_login: true,
        notify_excessive_views: true,
        excessive_views_threshold: 5,
        excessive_views_interval: 10,
        notify_suspicious_activity: true,
        notify_vpn_proxy: true,
        notify_multiple_devices: true,
        notify_odd_hours: false,
        odd_hours_start: 2,
        odd_hours_end: 6,
        notify_new_upload: true,
        notify_new_publish: true,
        notify_new_session: true,
        webhook_url: '',
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      }
    }

    // PUT - Update settings (admin only)
    if (event.httpMethod === 'PUT') {
      const user = getUser(event)
      if (!user || !ADMIN_IDS.includes(user.discord_id)) {
        return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) }
      }
      
      const body = JSON.parse(event.body || '{}')
      
      // Check if settings exist
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .single()

      console.log('PUT request body:', body)
      console.log('Existing settings:', existing)
      
      let result
      if (existing) {
        // Update existing
        console.log('Updating existing settings...')
        const updateData = {
          site_name: body.siteName,
          site_description: body.siteDescription,
          discord_guild_ids: body.discordGuildIds,
          require_role: body.requireRole,
          allow_new_members: body.allowNewMembers,
          max_sessions_per_user: body.maxSessionsPerUser,
          session_timeout: body.sessionTimeout,
          // Notification settings
          notify_country_change: body.notifyCountryChange,
          notify_ip_change: body.notifyIpChange,
          notify_unauthorized_login: body.notifyUnauthorizedLogin,
          notify_excessive_views: body.notifyExcessiveViews,
          excessive_views_threshold: body.excessiveViewsThreshold,
          excessive_views_interval: body.excessiveViewsInterval,
          notify_suspicious_activity: body.notifySuspiciousActivity,
          notify_vpn_proxy: body.notifyVpnProxy,
          notify_multiple_devices: body.notifyMultipleDevices,
          notify_odd_hours: body.notifyOddHours,
          odd_hours_start: body.oddHoursStart,
          odd_hours_end: body.oddHoursEnd,
          notify_new_upload: body.notifyNewUpload,
          notify_new_publish: body.notifyNewPublish,
          notify_new_session: body.notifyNewSession,
          allowed_roles: body.allowedRoles,
          webhook_url: body.webhookUrl,
          updated_at: new Date().toISOString(),
        }
        console.log('Update data:', updateData)
        
        result = await supabase
          .from('settings')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single()
        
        console.log('Update result:', result)
      } else {
        // Insert new
        result = await supabase
          .from('settings')
          .insert({
            site_name: body.siteName,
            site_description: body.siteDescription,
            discord_guild_ids: body.discordGuildIds,
            require_role: body.requireRole,
            allow_new_members: body.allowNewMembers,
            max_sessions_per_user: body.maxSessionsPerUser,
            session_timeout: body.sessionTimeout,
            // Notification settings
            notify_country_change: body.notifyCountryChange,
            notify_ip_change: body.notifyIpChange,
            notify_unauthorized_login: body.notifyUnauthorizedLogin,
            notify_excessive_views: body.notifyExcessiveViews,
            excessive_views_threshold: body.excessiveViewsThreshold,
            excessive_views_interval: body.excessiveViewsInterval,
            notify_suspicious_activity: body.notifySuspiciousActivity,
            notify_vpn_proxy: body.notifyVpnProxy,
            notify_multiple_devices: body.notifyMultipleDevices,
            notify_odd_hours: body.notifyOddHours,
            odd_hours_start: body.oddHoursStart,
            odd_hours_end: body.oddHoursEnd,
            notify_new_upload: body.notifyNewUpload,
            notify_new_publish: body.notifyNewPublish,
            notify_new_session: body.notifyNewSession,
            allowed_roles: body.allowedRoles,
            webhook_url: body.webhookUrl,
          })
          .select()
          .single()
      }

      if (result.error) {
        return { statusCode: 500, body: JSON.stringify({ message: result.error.message }) }
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: result.data, message: 'Settings saved successfully' }),
      }
    }

    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) }
  } catch (err: any) {
    console.error('Settings error:', err)
    return { statusCode: 500, body: JSON.stringify({ message: err.message || 'Internal server error' }) }
  }
}