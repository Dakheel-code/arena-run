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

function generateWatermarkCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const authHeader = event.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }
  const { valid } = verifyToken(authHeader.slice(7))
  if (!valid) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { video_id, discord_id, watch_seconds } = body

    if (!video_id || !discord_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'video_id and discord_id are required' })
      }
    }

    // Get IP and location info
    const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown'
    const userAgent = event.headers['user-agent'] || ''
    const watermarkCode = generateWatermarkCode()

    // Insert session directly - simple and works like login_logs
    const { data: session, error } = await supabase
      .from('watch_sessions')
      .insert({
        video_id,
        discord_id,
        watermark_code: watermarkCode,
        ip_address: ip,
        user_agent: userAgent,
        watch_seconds: watch_seconds || 0,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error logging watch session:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to log session', details: error.message })
      }
    }

    console.log('Watch session logged successfully:', session.id)

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        session_id: session.id,
        watermark_code: watermarkCode
      })
    }
  } catch (error: any) {
    console.error('Log watch session error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}
