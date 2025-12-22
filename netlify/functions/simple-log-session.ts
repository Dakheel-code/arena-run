import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const handler: Handler = async (event) => {
  // Allow all methods
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'OK' })
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    console.log('Received session log request:', body)

    const { video_id, discord_id, watch_seconds } = body

    // Simple insert - no validation, just log it
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
    } else {
      console.log('Session logged successfully')
    }

    // Always return success
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ success: true })
    }
  } catch (error: any) {
    console.error('Error:', error)
    // Still return success to not break the frontend
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ success: true })
    }
  }
}
