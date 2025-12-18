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

  const method = event.httpMethod

  // GET - List all members or get single member profile
  if (method === 'GET') {
    const discordId = event.queryStringParameters?.discord_id

    // Get single member profile with sessions
    if (discordId) {
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('discord_id', discordId)
        .single()

      if (memberError || !member) {
        return { statusCode: 404, body: JSON.stringify({ message: 'Member not found' }) }
      }

      // Get ALL sessions for this member (for total count)
      const { data: allSessions, count: totalSessions } = await supabase
        .from('view_sessions')
        .select('video_id, watch_seconds', { count: 'exact' })
        .eq('discord_id', discordId)

      // Get all sessions with video titles (for display with pagination on frontend)
      const { data: sessions } = await supabase
        .from('view_sessions')
        .select('*, videos(title)')
        .eq('discord_id', discordId)
        .order('started_at', { ascending: false })

      // Calculate stats
      const total_watch_time = allSessions?.reduce((sum, s) => sum + (s.watch_seconds || 0), 0) || 0
      const videos_watched = new Set(allSessions?.map(s => s.video_id)).size
      const total_views = totalSessions || allSessions?.length || 0

      // Get average watch time per session
      const avg_watch_time = total_views > 0 ? Math.round(total_watch_time / total_views) : 0

      // Get first session date (member since watching)
      const { data: firstSession } = await supabase
        .from('view_sessions')
        .select('started_at')
        .eq('discord_id', discordId)
        .order('started_at', { ascending: true })
        .limit(1)
        .single()

      // Get videos uploaded by this member
      const { data: uploadedVideos } = await supabase
        .from('videos')
        .select('id, title, thumbnail_url, stream_uid, duration, views_count, likes_count, is_published, created_at')
        .eq('uploaded_by', discordId)
        .order('created_at', { ascending: false })

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          profile: {
            ...member,
            sessions: sessions || [],
            total_watch_time,
            videos_watched,
            total_views,
            avg_watch_time,
            first_watch: firstSession?.started_at || null,
            uploaded_videos: uploadedVideos || []
          }
        }),
      }
    }

    // List all members
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ message: error.message }) }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members: data || [] }),
    }
  }

  // POST - Upload members from CSV
  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}')
    const { members } = body

    if (!members || !Array.isArray(members)) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Members array required' }) }
    }

    let count = 0
    for (const member of members) {
      if (!member.discord_id || !member.game_id) continue

      const { error } = await supabase
        .from('members')
        .upsert(
          {
            discord_id: member.discord_id,
            game_id: member.game_id,
            is_active: true,
          },
          { onConflict: 'discord_id' }
        )

      if (!error) count++
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, count }),
    }
  }

  // PATCH - Toggle member status
  if (method === 'PATCH') {
    const body = JSON.parse(event.body || '{}')
    const { discord_id, is_active } = body

    if (!discord_id) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Discord ID required' }) }
    }

    const { error } = await supabase
      .from('members')
      .update({ is_active })
      .eq('discord_id', discord_id)

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ message: error.message }) }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    }
  }

  return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) }
}
