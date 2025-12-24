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
    if (signature !== expectedSig) return { valid: false }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (payload.exp < Date.now()) return { valid: false }
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

  const token = authHeader.slice(7)
  const { valid, payload } = verifyToken(token)

  if (!valid) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Invalid token' }),
    }
  }

  // Get fresh member data from database
  const { data: memberData, error } = await supabase
    .from('members')
    .select('*')
    .eq('discord_id', payload.discord_id)
    .single()

  if (error || !memberData) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'Member not found' }),
    }
  }

  // Create new token with updated data
  const newToken = createToken({
    discord_id: memberData.discord_id,
    username: memberData.discord_username || payload.username,
    avatar: memberData.discord_avatar || payload.avatar,
    game_id: memberData.game_id,
    is_admin: memberData.role === 'admin' || memberData.role === 'super_admin',
    role: memberData.role || 'member',
  })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: newToken }),
  }
}
