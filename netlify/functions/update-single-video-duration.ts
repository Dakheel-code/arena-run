import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!
const CF_STREAM_API_TOKEN = process.env.CF_STREAM_API_TOKEN!
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

async function getVideoInfoFromCloudflare(streamUid: string) {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${streamUid}`,
      {
        headers: {
          Authorization: `Bearer ${CF_STREAM_API_TOKEN}`,
        },
      }
    )

    if (!response.ok) {
      console.error(`Failed to fetch video ${streamUid}:`, response.status)
      return null
    }

    const data = await response.json()
    return data.result
  } catch (error) {
    console.error(`Error fetching video ${streamUid}:`, error)
    return null
  }
}

export const handler: Handler = async (event) => {
  const user = getUser(event)
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { videoId } = body

    if (!videoId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Video ID required' }) }
    }

    // Get video from database
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('id, stream_uid, title')
      .eq('id', videoId)
      .single()

    if (fetchError || !video) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Video not found' }) }
    }

    console.log(`Fetching duration for video: ${video.title} (${video.stream_uid})`)
    
    const videoInfo = await getVideoInfoFromCloudflare(video.stream_uid)
    
    if (videoInfo && videoInfo.duration) {
      const duration = Math.round(videoInfo.duration)
      
      const { error: updateError } = await supabase
        .from('videos')
        .update({ duration })
        .eq('id', video.id)

      if (updateError) {
        console.error(`Failed to update video ${video.id}:`, updateError)
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to update duration' }),
        }
      }

      console.log(`✓ Updated ${video.title}: ${duration}s`)
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          duration,
        }),
      }
    } else {
      console.log(`✗ No duration available for ${video.title}`)
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          message: 'Video not ready yet',
        }),
      }
    }
  } catch (error: any) {
    console.error('Error updating duration:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message || 'Internal server error' }),
    }
  }
}
