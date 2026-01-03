import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI!
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!
const JWT_SECRET = process.env.JWT_SECRET!
const APP_URL = process.env.VITE_APP_URL || 'http://localhost:8888'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function exchangeCode(code: string) {
  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: DISCORD_REDIRECT_URI,
    }),
  })
  return response.json()
}

async function getDiscordUser(accessToken: string) {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return response.json()
}

async function getGuildIds() {
  try {
    const { data } = await supabase
      .from('settings')
      .select('discord_guild_ids')
      .single()
    
    if (data?.discord_guild_ids) {
      return data.discord_guild_ids.split(',').map((id: string) => id.trim()).filter(Boolean)
    }
    return []
  } catch (error) {
    return []
  }
}

async function checkGuildMembership(userId: string, guildIds: string[]) {
  try {
    // Check if user is a member of any of the allowed guilds
    for (const guildId of guildIds) {
      const response = await fetch(
        `https://discord.com/api/guilds/${guildId}/members/${userId}`,
        {
          headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        }
      )
      
      if (response.ok) {
        return { member: await response.json(), guildId }
      }
    }
    
    return null
  } catch (error) {
    console.error('Failed to check guild membership:', error)
    return null
  }
}

async function getAllowedRoles() {
  try {
    const { data } = await supabase
      .from('settings')
      .select('allowed_roles')
      .single()
    
    if (data?.allowed_roles) {
      return data.allowed_roles.split(',').map((r: string) => r.trim()).filter(Boolean)
    }
    return []
  } catch (error) {
    return []
  }
}

async function sendDiscordNotification(message: string, color: number = 5814783, options?: { userId?: string, username?: string, avatarUrl?: string }) {
  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('webhook_url')
      .single()
    
    if (!settings?.webhook_url) {
      console.log('No webhook URL configured')
      return
    }

    const embed: any = {
      title: '🔔 Arena Run Notification',
      description: message,
      color: color,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Arena Run Security System'
      }
    }

    if (options?.username && options?.avatarUrl) {
      embed.author = {
        name: options.username,
        icon_url: options.avatarUrl
      }
    }

    await fetch(settings.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    })

    console.log('Notification sent successfully')
  } catch (error) {
    console.error('Failed to send notification:', error)
  }
}

function createToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url')
  const crypto = require('crypto')
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}

async function getLocationFromIP(ip: string) {
  try {
    if (!ip || ip === 'Unknown') return { country: null, city: null }
    
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`)
    const data = await response.json()
    
    if (data.status === 'success') {
      return {
        country: data.country || null,
        city: data.city || null
      }
    }
    return { country: null, city: null }
  } catch (error) {
    console.error('Failed to get location:', error)
    return { country: null, city: null }
  }
}

async function logLoginAttempt(data: {
  discord_id: string
  discord_username?: string
  discord_global_name?: string
  discord_avatar?: string
  email?: string
  status: 'success' | 'failed'
  failure_reason?: string
  ip_address?: string
  country?: string
  city?: string
  user_agent?: string
  is_admin?: boolean
  is_member?: boolean
}) {
  try {
    console.log('Logging login attempt for:', data.discord_username)
    const { data: result, error } = await supabase.from('login_logs').insert({
      discord_id: data.discord_id,
      discord_username: data.discord_username,
      discord_avatar: data.discord_avatar,
      email: data.email,
      status: data.status,
      failure_reason: data.failure_reason,
      ip_address: data.ip_address,
      country: data.country,
      city: data.city,
      user_agent: data.user_agent,
      is_admin: data.is_admin || false,
      is_member: data.is_member || false,
      logged_at: new Date().toISOString()
    })
    
    if (error) {
      console.error('Failed to log login attempt - Supabase error:', error)
    } else {
      console.log('Login attempt logged successfully')
    }
  } catch (error) {
    console.error('Failed to log login attempt - Exception:', error)
  }
}

export const handler: Handler = async (event) => {
  const code = event.queryStringParameters?.code

  if (!code) {
    return {
      statusCode: 302,
      headers: { Location: `${APP_URL}/?error=no_code` },
    }
  }

  try {
    console.log('Starting auth callback...')
    
    // Exchange code for tokens
    const tokens = await exchangeCode(code)
    console.log('Token exchange result:', tokens.error ? 'ERROR' : 'SUCCESS')
    
    if (tokens.error) {
      console.error('Token exchange error:', tokens.error)
      return {
        statusCode: 302,
        headers: { Location: `${APP_URL}/?error=token_exchange` },
      }
    }

    // Get Discord user
    const discordUser = await getDiscordUser(tokens.access_token)
    console.log('Discord user:', discordUser.username, discordUser.id)
    console.log('Discord global_name:', discordUser.global_name)
    
    // Default avatar (will be replaced with guild avatar if available)
    let avatarUrl = discordUser.avatar 
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null

    // Get guild IDs from settings
    const guildIds = await getGuildIds()
    console.log('Allowed guild IDs:', guildIds)

    // Check guild membership
    console.log('Checking guild membership...')
    const memberResult = await checkGuildMembership(discordUser.id, guildIds)
    
    if (!memberResult) {
      console.log('User is not a member of the required guild')
      const ip_address = event.headers['x-nf-client-connection-ip'] || 
                         event.headers['x-forwarded-for']?.split(',')[0].trim() || 
                         'Unknown'
      const user_agent = event.headers['user-agent']
      const location = await getLocationFromIP(ip_address)

      await logLoginAttempt({
        discord_id: discordUser.id,
        discord_username: discordUser.username,
        discord_global_name: discordUser.global_name,
        discord_avatar: avatarUrl || undefined,
        email: discordUser.email,
        status: 'failed',
        failure_reason: 'Not a member of the required Discord server',
        ip_address,
        country: location.country || undefined,
        city: location.city || undefined,
        user_agent,
        is_admin: false,
        is_member: false
      })

      // Send notification for unauthorized login attempt
      const { data: settings } = await supabase
        .from('settings')
        .select('notify_unauthorized_login')
        .single()
      
      if (settings?.notify_unauthorized_login) {
        const locationStr = location.city && location.country 
          ? `${location.city}, ${location.country}` 
          : 'Unknown'
        
        await sendDiscordNotification(
          `⚠️ **Unauthorized Login Attempt**\n\n` +
          `**User:** <@${discordUser.id}>\n` +
          `**Reason:** Missing required role (Deputy)\n` +
          `**Location:** ${locationStr}\n` +
          `**IP Address:** ${ip_address}`,
          15158332, // Red color
          {
            userId: discordUser.id,
            username: discordUser.username,
            avatarUrl: avatarUrl || `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.id) % 5}.png`
          }
        )
      }

      return {
        statusCode: 302,
        headers: { Location: `${APP_URL}/?error=not_in_guild` },
      }
    }

    const member = memberResult.member
    const userGuildId = memberResult.guildId
    const serverNickname = member.nick || discordUser.global_name || discordUser.username
    console.log('Server nickname:', serverNickname)
    
    // Use guild avatar if available, otherwise use default avatar
    if (member.avatar) {
      avatarUrl = `https://cdn.discordapp.com/guilds/${userGuildId}/users/${discordUser.id}/avatars/${member.avatar}.png`
      console.log('Using guild avatar:', avatarUrl)
    } else {
      console.log('Using default Discord avatar:', avatarUrl)
    }

    // Check for required role
    console.log('Checking required role...')
    const allowedRoles = await getAllowedRoles()
    console.log('Allowed roles:', allowedRoles)
    console.log('User roles:', member.roles)

    let hasRequiredRole = false
    if (allowedRoles.length > 0) {
      // Get guild roles to map IDs to names
      const guildRolesResponse = await fetch(
        `https://discord.com/api/guilds/${userGuildId}/roles`,
        {
          headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        }
      )
      const guildRoles = await guildRolesResponse.json()
      
      // Check if user has any of the allowed roles
      for (const roleId of member.roles || []) {
        const role = guildRoles.find((r: any) => r.id === roleId)
        if (role && allowedRoles.includes(role.name)) {
          console.log('User has allowed role:', role.name)
          hasRequiredRole = true
          break
        }
      }

      if (!hasRequiredRole) {
        console.log('User does not have required role')
        const ip_address = event.headers['x-nf-client-connection-ip'] || 
                           event.headers['x-forwarded-for']?.split(',')[0].trim() || 
                           'Unknown'
        const user_agent = event.headers['user-agent']
        const location = await getLocationFromIP(ip_address)

        await logLoginAttempt({
          discord_id: discordUser.id,
          discord_username: discordUser.username,
          discord_global_name: serverNickname,
          discord_avatar: avatarUrl || undefined,
          email: discordUser.email,
          status: 'failed',
          failure_reason: 'Missing required role',
          ip_address,
          country: location.country || undefined,
          city: location.city || undefined,
          user_agent,
          is_admin: false,
          is_member: true
        })

        // Send notification for missing role
        const { data: roleSettings } = await supabase
          .from('settings')
          .select('notify_unauthorized_login')
          .single()
        
        if (roleSettings?.notify_unauthorized_login) {
          const locationStr = location.city && location.country 
            ? `${location.city}, ${location.country}` 
            : 'Unknown'
          
          await sendDiscordNotification(
            `⚠️ **Unauthorized Login Attempt**\n\n` +
            `**User:** <@${discordUser.id}>\n` +
            `**Reason:** Missing required role (${allowedRoles.join(', ')})\n` +
            `**Location:** ${locationStr}\n` +
            `**IP Address:** ${ip_address}`,
            15105570, // Orange color
            {
              userId: discordUser.id,
              username: serverNickname,
              avatarUrl: avatarUrl || `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.id) % 5}.png`
            }
          )
        }

        return {
          statusCode: 302,
          headers: { Location: `${APP_URL}/?error=missing_role` },
        }
      }
    }

    // Check if member exists in database
    let { data: memberData } = await supabase
      .from('members')
      .select('*')
      .eq('discord_id', discordUser.id)
      .single()

    console.log('Member exists in database:', !!memberData)

    if (!memberData) {
      // Create new member
      console.log('Creating new member...')
      const { data: newMember, error: insertError } = await supabase
        .from('members')
        .insert({ 
          discord_id: discordUser.id, 
          discord_username: discordUser.username,
          discord_global_name: serverNickname,
          discord_avatar: avatarUrl,
          game_id: discordUser.username.toLowerCase().replace(/\s+/g, '_') || 'player', 
          is_active: true,
          role: 'member',
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          login_count: 1
        })
        .select()
        .single()
      
      if (insertError) {
        console.error('Failed to create member:', insertError)
        return {
          statusCode: 302,
          headers: { Location: `${APP_URL}/?error=member_creation_failed` },
        }
      }
      memberData = newMember
      console.log('Member created successfully')
    } else {
      // Update existing member
      console.log('Updating existing member...')
      await supabase
        .from('members')
        .update({ 
          discord_username: discordUser.username,
          discord_global_name: serverNickname,
          discord_avatar: avatarUrl,
          last_login: new Date().toISOString(),
          login_count: (memberData.login_count || 0) + 1
        })
        .eq('discord_id', discordUser.id)
      console.log('Member updated successfully')
    }

    // Log successful login
    const ip_address = event.headers['x-nf-client-connection-ip'] || 
                       event.headers['x-forwarded-for']?.split(',')[0].trim() || 
                       'Unknown'
    const user_agent = event.headers['user-agent']
    const location = await getLocationFromIP(ip_address)

    await logLoginAttempt({
      discord_id: discordUser.id,
      discord_username: discordUser.username,
      discord_global_name: serverNickname,
      discord_avatar: avatarUrl || undefined,
      email: discordUser.email,
      status: 'success',
      ip_address,
      country: location.country || undefined,
      city: location.city || undefined,
      user_agent,
      is_admin: memberData.role === 'admin' || memberData.role === 'super_admin',
      is_member: true
    })

    // Send notification for new login
    const { data: settings } = await supabase
      .from('settings')
      .select('notify_new_session')
      .single()
    
    if (settings?.notify_new_session) {
      const locationStr = location.city && location.country 
        ? `${location.city}, ${location.country}` 
        : 'Unknown'
      
      await sendDiscordNotification(
        `✅ **New Login Session**\n\n` +
        `👤 **User:** ${discordUser.username}\n` +
        `🆔 **Discord ID:** ${discordUser.id}\n` +
        `🌍 **Location:** ${locationStr}\n` +
        `📍 **IP Address:** ${ip_address}\n` +
        `🔐 **Role:** ${memberData.role || 'member'}`,
        3066993 // Green color
      )
    }

    // Create JWT token
    const token = createToken({
      discord_id: discordUser.id,
      username: discordUser.username,
      avatar: avatarUrl,
      game_id: memberData.game_id,
      is_admin: memberData.role === 'admin' || memberData.role === 'super_admin',
      role: memberData.role || 'member',
    })

    console.log('Token created, redirecting to:', `${APP_URL}/app?token=${token.substring(0, 20)}...`)

    return {
      statusCode: 302,
      headers: { Location: `${APP_URL}/app?token=${token}` },
    }
  } catch (error) {
    console.error('Auth error:', error)
    return {
      statusCode: 302,
      headers: { Location: `${APP_URL}/?error=unknown` },
    }
  }
}
