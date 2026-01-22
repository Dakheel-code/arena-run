import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const JWT_SECRET = process.env.JWT_SECRET!

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function verifyToken(token: string): { valid: boolean; payload?: any } {
  try {
    const [header, body, signature] = token.split('.')
    const crypto = require('crypto')
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
    
    if (signature !== expectedSig) {
      return { valid: false }
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    
    // Allow refresh even if token is expired (within 30 days)
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    if (payload.exp < Date.now() - thirtyDaysMs) {
      return { valid: false }
    }

    return { valid: true, payload }
  } catch {
    return { valid: false }
  }
}

function createToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url')
  const crypto = require('crypto')
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}

export const handler: Handler = async (event) => {
  const authHeader = event.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthorized' }),
    }
  }

  const oldToken = authHeader.slice(7)
  const { valid, payload } = verifyToken(oldToken)

  if (!valid || !payload) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Invalid token' }),
    }
  }

  // Verify user still exists and is active
  const { data: member } = await supabase
    .from('members')
    .select('discord_id, discord_username, discord_avatar, game_id, role, is_active')
    .eq('discord_id', payload.discord_id)
    .eq('is_active', true)
    .single()

  if (!member) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'User not found or inactive' }),
    }
  }

  // Check if user is admin
  const { data: adminData } = await supabase
    .from('admins')
    .select('*')
    .eq('discord_id', payload.discord_id)
    .single()

  const ADMIN_IDS = (process.env.ADMIN_DISCORD_IDS || '').split(',').map(id => id.trim()).filter(Boolean)
  const isAdmin = !!adminData || ADMIN_IDS.includes(payload.discord_id)

  // Create new token with fresh expiration
  const newToken = createToken({
    discord_id: member.discord_id,
    username: member.discord_username || payload.username,
    avatar: member.discord_avatar || payload.avatar,
    game_id: member.game_id || payload.game_id,
    is_admin: isAdmin,
    role: member.role || 'member',
  })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: newToken }),
  }
}
