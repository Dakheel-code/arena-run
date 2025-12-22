import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
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
