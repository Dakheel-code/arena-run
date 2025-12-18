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
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) }
  }

  const method = event.httpMethod

  // POST - Toggle like
  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}')
    const { video_id } = body

    if (!video_id) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Video ID is required' }) }
    }

    // Check if user already liked
    const { data: existingLike } = await supabase
      .from('video_likes')
      .select('id')
      .eq('video_id', video_id)
      .eq('discord_id', user.discord_id)
      .single()

    let liked = false

    if (existingLike) {
      // Unlike - remove the like
      await supabase
        .from('video_likes')
        .delete()
        .eq('video_id', video_id)
        .eq('discord_id', user.discord_id)

      // Decrement likes count
      await supabase.rpc('decrement_likes', { vid: video_id })
    } else {
      // Like - add the like
      await supabase
        .from('video_likes')
        .insert({
          video_id,
          discord_id: user.discord_id,
        })

      // Increment likes count
      await supabase.rpc('increment_likes', { vid: video_id })
      liked = true
    }

    // Get updated likes count
    const { data: video } = await supabase
      .from('videos')
      .select('likes_count')
      .eq('id', video_id)
      .single()

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        liked, 
        likes_count: video?.likes_count || 0 
      }),
    }
  }

  return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) }
}
