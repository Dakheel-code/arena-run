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

  // Get total views
  const { count: totalViews } = await supabase
    .from('view_sessions')
    .select('*', { count: 'exact', head: true })

  // Get active members count
  const { count: totalMembers } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // Get total videos
  const { count: totalVideos } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })

  // Get recent sessions
  const { data: recentSessions } = await supabase
    .from('view_sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(10)

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      totalViews: totalViews || 0,
      totalMembers: totalMembers || 0,
      totalVideos: totalVideos || 0,
      recentSessions: recentSessions || [],
    }),
  }
}
