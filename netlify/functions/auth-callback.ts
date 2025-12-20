import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI!
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!
const DISCORD_GUILD_IDS = [
  process.env.DISCORD_GUILD_ID!,
  process.env.DISCORD_GUILD_ID_2,
].filter(Boolean) as string[]
const DISCORD_REQUIRED_ROLE_ID = process.env.DISCORD_REQUIRED_ROLE_ID!
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

async function checkGuildMembership(userId: string) {
  for (const guildId of DISCORD_GUILD_IDS) {
    const response = await fetch(
      `https://discord.com/api/guilds/${guildId}/members/${userId}`,
      { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }
    )
    if (response.ok) {
      return response.json()
    }
  }
  return null
}

function createToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url')
  const crypto = require('crypto')
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}

async function logLoginAttempt(data: {
  discord_id: string
  discord_username?: string
  discord_discriminator?: string
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
  has_required_role?: boolean
}) {
  try {
    await supabase.from('login_logs').insert(data)
  } catch (error) {
    console.error('Failed to log login attempt:', error)
  }
}

async function getLocationFromIP(ip?: string) {
  if (!ip || ip === 'Unknown' || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: 'Local', city: 'Local' }
  }
  try {
    console.log('Fetching location for IP:', ip)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`)
    const data = await response.json()
    console.log('Location data:', data)
    
    if (data.status === 'success') {
      return { 
        country: data.country || 'Unknown', 
        city: data.city || 'Unknown' 
      }
    }
    return { country: 'Unknown', city: 'Unknown' }
  } catch (error) {
    console.error('Error fetching location:', error)
    return { country: 'Unknown', city: 'Unknown' }
  }
}

async function sendUnauthorizedLoginNotification(data: {
  username: string
  discord_id: string
  reason: string
  ip_address: string
  country: string
  city: string
  user_agent?: string
}) {
  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('webhook_url, notify_unauthorized_login')
      .single()

    if (!settings?.notify_unauthorized_login || !settings?.webhook_url) {
      return
    }

    const location = data.city ? `${data.city}, ${data.country}` : data.country
    const userAgentShort = data.user_agent ? data.user_agent.substring(0, 100) : 'Unknown'

    await fetch(settings.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '🚫 Unauthorized Login Attempt',
          description: `Someone tried to login without permission`,
          color: 0xff0000,
          fields: [
            { name: 'Username', value: data.username, inline: true },
            { name: 'Discord ID', value: data.discord_id, inline: true },
            { name: 'Reason', value: data.reason, inline: false },
            { name: 'IP Address', value: data.ip_address, inline: true },
            { name: 'Location', value: location, inline: true },
            { name: 'User Agent', value: userAgentShort, inline: false },
          ],
          timestamp: new Date().toISOString(),
        }],
      }),
    })
  } catch (error) {
    console.error('Failed to send unauthorized login notification:', error)
  }
}

export const handler: Handler = async (event) => {
  const code = event.queryStringParameters?.code
  // Get real IP address from headers (Netlify provides x-nf-client-connection-ip)
  const ip_address = event.headers['x-nf-client-connection-ip'] || 
                     event.headers['x-forwarded-for']?.split(',')[0].trim() || 
                     event.headers['client-ip'] || 
                     'Unknown'
  const user_agent = event.headers['user-agent']

  if (!code) {
    return {
      statusCode: 302,
      headers: { Location: `${APP_URL}/login?error=no_code` },
    }
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCode(code)
    if (tokens.error) {
      return {
        statusCode: 302,
        headers: { Location: `${APP_URL}/login?error=token_exchange` },
      }
    }

    // Get Discord user
    const discordUser = await getDiscordUser(tokens.access_token)
    const location = await getLocationFromIP(ip_address)
    const avatarUrl = discordUser.avatar 
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null

    // Check guild membership and role
    const member = await checkGuildMembership(discordUser.id)
    if (!member) {
      await logLoginAttempt({
        discord_id: discordUser.id,
        discord_username: discordUser.username,
        discord_discriminator: discordUser.discriminator,
        discord_avatar: avatarUrl || undefined,
        email: discordUser.email,
        status: 'failed',
        failure_reason: 'Not a member of the required Discord server',
        ip_address,
        country: location.country,
        city: location.city,
        user_agent,
        is_admin: false,
        is_member: false,
        has_required_role: false,
      })
      
      // Send unauthorized login notification
      await sendUnauthorizedLoginNotification({
        username: discordUser.username,
        discord_id: discordUser.id,
        reason: 'Not a member of the required Discord server',
        ip_address,
        country: location.country,
        city: location.city,
        user_agent,
      })
      
      return {
        statusCode: 302,
        headers: { Location: `${APP_URL}/login?error=not_in_guild` },
      }
    }

    // Check for required role (Deputy) - TEMPORARILY DISABLED FOR TESTING
    // const hasRole = member.roles.includes(DISCORD_REQUIRED_ROLE_ID)
    // if (!hasRole) {
    //   await logLoginAttempt({
    //     discord_id: discordUser.id,
    //     discord_username: discordUser.username,
    //     discord_discriminator: discordUser.discriminator,
    //     discord_avatar: avatarUrl,
    //     email: discordUser.email,
    //     status: 'failed',
    //     failure_reason: 'Missing required role (Deputy)',
    //     ip_address,
    //     country: location.country,
    //     city: location.city,
    //     user_agent,
    //     is_admin: false,
    //     is_member: true,
    //     has_required_role: false,
    //   })
    //   return {
    //     statusCode: 302,
    //     headers: { Location: `${APP_URL}/login?error=missing_role` },
    //   }
    // }

    // Check allowlist - try to find member, if not found create one for testing
    console.log('Looking for member with discord_id:', discordUser.id)
    
    let { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('discord_id', discordUser.id)
      .eq('is_active', true)
      .single()

    console.log('Member lookup result:', memberData, memberError)

    if (!memberData) {
      // Auto-add member for testing
      console.log('Member not found, creating new member...')
      const { data: newMember, error: insertError } = await supabase
        .from('members')
        .insert({ 
          discord_id: discordUser.id, 
          discord_username: discordUser.username,
          game_id: discordUser.username || 'Player', 
          is_active: true 
        })
        .select()
        .single()
      
      console.log('Insert result:', newMember, insertError)
      
      if (insertError) {
        console.error('Failed to create member:', insertError)
      }
      memberData = newMember
    } else {
      // Update discord_username, avatar and login info for existing member
      await supabase
        .from('members')
        .update({ 
          discord_username: discordUser.username,
          discord_avatar: avatarUrl,
          last_login: new Date().toISOString(),
          login_count: (memberData.login_count || 0) + 1
        })
        .eq('discord_id', discordUser.id)
    }

    // Check if user is admin (you can set this in database)
    const { data: adminData } = await supabase
      .from('admins')
      .select('*')
      .eq('discord_id', discordUser.id)
      .single()

    const isAdmin = !!adminData
    const isMember = !!memberData
    const hasRequiredRole = true // member.roles.includes(DISCORD_REQUIRED_ROLE_ID)

    // Log successful login
    await logLoginAttempt({
      discord_id: discordUser.id,
      discord_username: discordUser.username,
      discord_discriminator: discordUser.discriminator,
      discord_avatar: avatarUrl || undefined,
      email: discordUser.email,
      status: 'success',
      ip_address,
      country: location.country,
      city: location.city,
      user_agent,
      is_admin: isAdmin,
      is_member: isMember,
      has_required_role: hasRequiredRole,
    })

    // Create JWT token
    const token = createToken({
      discord_id: discordUser.id,
      username: discordUser.username,
      avatar: avatarUrl,
      game_id: memberData.game_id,
      is_admin: isAdmin,
      role: memberData.role || 'member',
    })

    return {
      statusCode: 302,
      headers: { Location: `${APP_URL}/?token=${token}` },
    }
  } catch (error) {
    console.error('Auth error:', error)
    return {
      statusCode: 302,
      headers: { Location: `${APP_URL}/login?error=unknown` },
    }
  }
}
