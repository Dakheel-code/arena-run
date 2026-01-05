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

function getUser(event: any) {
  const authHeader = event.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const { valid, payload } = verifyToken(authHeader.slice(7))
  return valid ? payload : null
}

export const handler: Handler = async (event) => {
  const user = getUser(event)
  if (!user || !user.is_admin) {
    return { statusCode: 403, body: JSON.stringify({ message: 'Forbidden' }) }
  }

  // GET - List all sessions with member and video details
  if (event.httpMethod === 'GET') {
    // Get all sessions with video titles
    const { data: sessions, error } = await supabase
      .from('view_sessions')
      .select('*, videos(title)')
      .gte('watch_seconds', 3)
      .order('started_at', { ascending: false })
      .limit(1000)

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ message: error.message }) }
    }

    // Get member info for all sessions
    const discordIds = [...new Set(sessions?.map(s => s.discord_id) || [])]
    const { data: members } = await supabase
      .from('members')
      .select('discord_id, discord_username, discord_global_name, game_id, discord_avatar')
      .in('discord_id', discordIds)

    // Create a map for quick lookup
    const memberMap = new Map(members?.map(m => [m.discord_id, m]) || [])

    // Merge member info with sessions
    const sessionsWithMembers = sessions?.map(session => ({
      ...session,
      member_name: memberMap.get(session.discord_id)?.discord_global_name || 
                   memberMap.get(session.discord_id)?.discord_username || 
                   memberMap.get(session.discord_id)?.game_id || 
                   session.discord_id.slice(0, 10) + '...',
      member_avatar: memberMap.get(session.discord_id)?.discord_avatar || null
    })) || []

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions: sessionsWithMembers }),
    }
  }

  return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) }
}
