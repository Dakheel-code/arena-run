import type { Handler, HandlerResponse } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const JWT_SECRET = process.env.JWT_SECRET!

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function verifyToken(token: string): boolean {
  try {
    const [header, body, signature] = token.split('.')
    const crypto = require('crypto')
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
    if (signature !== expectedSig) return false
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (payload.exp < Date.now()) return false
    return true
  } catch {
    return false
  }
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Method not allowed' }) }
  }

  const authHeader = event.headers.authorization
  if (!authHeader?.startsWith('Bearer ') || !verifyToken(authHeader.slice(7))) {
    return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { video_id, discord_id, watch_seconds } = body

    const { error } = await supabase
      .from('watch_sessions')
      .insert({
        video_id: video_id || '00000000-0000-0000-0000-000000000000',
        discord_id: discord_id || 'unknown',
        watermark_code: Math.random().toString(36).substring(7).toUpperCase(),
        watch_seconds: watch_seconds || 0,
        started_at: new Date().toISOString()
      })

    if (error) {
      console.error('Insert error:', error)
    }

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true }) }
  } catch (error: any) {
    console.error('Error:', error)
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true }) }
  }
}
