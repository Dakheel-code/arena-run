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
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) }
  }

  const method = event.httpMethod

  // GET - List all members or get single member
  if (method === 'GET') {
    const discordId = event.queryStringParameters?.discord_id

    // Get single member profile
    if (discordId) {
      const { data: member, error } = await supabase
        .from('members')
        .select('*')
        .eq('discord_id', discordId)
        .single()

      if (error) {
        console.error('Error fetching member:', error)
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Member not found' })
        }
      }

      // Get watch sessions with video details
      const { data: sessions, error: sessionsError } = await supabase
        .from('watch_sessions')
        .select(`
          *,
          videos (
            title,
            thumbnail_url,
            stream_uid
          )
        `)
        .eq('discord_id', discordId)
        .order('started_at', { ascending: false })

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError)
      }

      // Get uploaded videos
      const { data: uploadedVideos, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('uploaded_by', discordId)
        .order('created_at', { ascending: false })

      if (videosError) {
        console.error('Error fetching uploaded videos:', videosError)
      }

      // Get login logs
      const { data: loginLogs, error: logsError } = await supabase
        .from('login_logs')
        .select('*')
        .eq('discord_id', discordId)
        .order('logged_in_at', { ascending: false })
        .limit(50)

      if (logsError) {
        console.error('Error fetching login logs:', logsError)
      }

      // Calculate stats
      const totalWatchTime = sessions?.reduce((sum, s) => sum + (s.watch_seconds || 0), 0) || 0
      const videosWatched = new Set(sessions?.map(s => s.video_id)).size || 0
      const totalViews = sessions?.length || 0
      const avgWatchTime = totalViews > 0 ? Math.floor(totalWatchTime / totalViews) : 0
      const firstWatch = sessions && sessions.length > 0 ? sessions[sessions.length - 1].started_at : null
      // Use login_logs length if available, otherwise fallback to member.login_count
      const loginCount = loginLogs?.length || member.login_count || 0

      return {
        statusCode: 200,
        body: JSON.stringify({ 
          profile: {
            ...member,
            sessions: sessions || [],
            uploaded_videos: uploadedVideos || [],
            login_logs: loginLogs || [],
            total_watch_time: totalWatchTime,
            videos_watched: videosWatched,
            total_views: totalViews,
            avg_watch_time: avgWatchTime,
            first_watch: firstWatch,
            login_count: loginCount
          }
        })
      }
    }

    // List all members
    const { data: members, error } = await supabase
      .from('members')
      .select('id, discord_id, discord_username, discord_global_name, discord_avatar, game_id, is_active, role, last_login, login_count, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching members:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ members })
    }
  }

  // POST - Add new member
  if (method === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}')
      
      // Handle single member addition
      if (body.discord_id && body.game_id) {
        const { data: member, error } = await supabase
          .from('members')
          .insert({
            discord_id: body.discord_id,
            discord_username: body.discord_username || null,
            game_id: body.game_id,
            is_active: true
          })
          .select()
          .single()

        if (error) {
          console.error('Error adding member:', error)
          return {
            statusCode: 400,
            body: JSON.stringify({ error: error.message })
          }
        }

        return {
          statusCode: 200,
          body: JSON.stringify({ success: true, member })
        }
      }
      
      // Handle bulk upload
      if (body.members && Array.isArray(body.members)) {
        const { data: members, error } = await supabase
          .from('members')
          .insert(body.members.map((m: any) => ({
            discord_id: m.discord_id,
            discord_username: m.discord_username || null,
            game_id: m.game_id,
            is_active: true
          })))
          .select()

        if (error) {
          console.error('Error uploading members:', error)
          return {
            statusCode: 400,
            body: JSON.stringify({ error: error.message })
          }
        }

        return {
          statusCode: 200,
          body: JSON.stringify({ success: true, count: members?.length || 0, members })
        }
      }

      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request data' })
      }

    } catch (error) {
      console.error('Error parsing request:', error)
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON' })
      }
    }
  }

  // PATCH - Update member
  if (method === 'PATCH') {
    try {
      const body = JSON.parse(event.body || '{}')
      const { discord_id, is_active, role, game_id } = body

      if (!discord_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'discord_id is required' })
        }
      }

      // Only allow specific safe fields to be updated
      const updateData: Record<string, any> = {}
      if (is_active !== undefined) updateData.is_active = is_active
      if (role !== undefined) {
        // Only super_admin can assign super_admin role
        if (role === 'super_admin' && !user.role?.includes('super_admin')) {
          return { statusCode: 403, body: JSON.stringify({ error: 'Insufficient permissions to assign super_admin role' }) }
        }
        updateData.role = role
      }
      if (game_id !== undefined) updateData.game_id = game_id

      if (Object.keys(updateData).length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'No valid fields to update' }) }
      }

      const { data: member, error } = await supabase
        .from('members')
        .update(updateData)
        .eq('discord_id', discord_id)
        .select()
        .single()

      if (error) {
        console.error('Error updating member:', error)
        return {
          statusCode: 400,
          body: JSON.stringify({ error: error.message })
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, member })
      }

    } catch (error) {
      console.error('Error parsing request:', error)
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON' })
      }
    }
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ message: 'Method not allowed' })
  }
}
