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
    const { video_id, discord_id, action, watch_seconds } = body

    if (!video_id || !discord_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'video_id and discord_id are required' })
      }
    }

    // Get IP and location info
    const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown'
    const userAgent = event.headers['user-agent'] || ''

    if (action === 'start') {
      // Create new session
      const watermarkCode = generateWatermarkCode()
      
      const { data: session, error } = await supabase
        .from('watch_sessions')
        .insert({
          video_id,
          discord_id,
          watermark_code: watermarkCode,
          ip_address: ip,
          user_agent: userAgent,
          started_at: new Date().toISOString(),
          watch_seconds: 0
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating session:', error)
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to create session' })
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ 
          session_id: session.id,
          watermark_code: watermarkCode
        })
      }
    } else if (action === 'update') {
      // Update existing session
      const { session_id } = body

      if (!session_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'session_id is required for update' })
        }
      }

      const { error } = await supabase
        .from('watch_sessions')
        .update({
          watch_seconds: watch_seconds || 0,
          ended_at: new Date().toISOString()
        })
        .eq('id', session_id)
        .eq('discord_id', discord_id)

      if (error) {
        console.error('Error updating session:', error)
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to update session' })
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      }
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid action' })
    }
  } catch (error: any) {
    console.error('Track session error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}
