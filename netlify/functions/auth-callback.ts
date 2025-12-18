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

export const handler: Handler = async (event) => {
  const code = event.queryStringParameters?.code

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

    // Check guild membership and role
    const member = await checkGuildMembership(discordUser.id)
    if (!member) {
      return {
        statusCode: 302,
        headers: { Location: `${APP_URL}/login?error=not_in_guild` },
      }
    }

    // Check for required role (Deputy) - TEMPORARILY DISABLED FOR TESTING
    // const hasRole = member.roles.includes(DISCORD_REQUIRED_ROLE_ID)
    // if (!hasRole) {
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
      const avatarUrl = discordUser.avatar 
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null
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

    // Create full avatar URL
    const avatarFullUrl = discordUser.avatar 
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null

    // Create JWT token
    const token = createToken({
      discord_id: discordUser.id,
      username: discordUser.username,
      avatar: avatarFullUrl,
      game_id: memberData.game_id,
      is_admin: !!adminData,
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
