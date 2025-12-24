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

async function sendDiscordNotification(
  title: string, 
  description: string, 
  fields?: Array<{name: string, value: string, inline?: boolean}>,
  options?: {
    discordId?: string,
    avatarUrl?: string,
    videoUrl?: string,
    authorName?: string
  }
) {
  // Get webhook URL from settings
  const { data: settings } = await supabase
    .from('settings')
    .select('webhook_url, notify_new_upload, notify_new_publish')
    .single()
  
  if (!settings?.webhook_url) return
  
  // Check if notifications are enabled
  const isUploadNotification = title.includes('Upload')
  const isPublishNotification = title.includes('Published')
  
  if (isUploadNotification && !settings.notify_new_upload) return
  if (isPublishNotification && !settings.notify_new_publish) return
  
  // Add mention to description if discord ID provided
  let finalDescription = description
  if (options?.discordId) {
    finalDescription = `<@${options.discordId}>\n\n${description}`
  }
  
  const embed: any = {
    title,
    description: finalDescription,
    color: 0xF59E0B, // Gold/Amber color
    fields: fields || [],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'RGR - Arena Run'
    }
  }
  
  // Add image with avatar if provided
  if (options?.avatarUrl) {
    embed.image = {
      url: options.avatarUrl
    }
  }
  
  const payload: any = {
    embeds: [embed]
  }
  
  // Add button if video URL provided
  if (options?.videoUrl) {
    payload.components = [{
      type: 1, // Action Row
      components: [{
        type: 2, // Button
        style: 5, // Link button
        label: 'Watch Video',
        url: options.videoUrl,
        emoji: {
          name: '▶️'
        }
      }]
    }]
  }
  
  await fetch(settings.webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export const handler: Handler = async (event) => {
  const user = getUser(event)
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) }
  }

  const method = event.httpMethod

  // GET - List videos or get single video
  if (method === 'GET') {
    const videoId = event.queryStringParameters?.id

    if (videoId) {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single()

      if (error || !data) {
        return { statusCode: 404, body: JSON.stringify({ message: 'Video not found' }) }
      }

      // Check if user liked this video
      const { data: likeData } = await supabase
        .from('video_likes')
        .select('id')
        .eq('video_id', videoId)
        .eq('discord_id', user.discord_id)
        .single()

      // Get uploader avatar from members table
      let uploader_avatar = null
      if (data.uploaded_by) {
        const { data: member } = await supabase
          .from('members')
          .select('discord_avatar')
          .eq('discord_id', data.uploaded_by)
          .single()
        uploader_avatar = member?.discord_avatar || null
      }

      // Note: View count is incremented in playback.ts when session starts, not here

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          video: { 
            ...data, 
            user_liked: !!likeData,
            uploader_avatar
          } 
        }),
      }
    }

    // List all videos (admin sees all, users see published only)
    const query = supabase.from('videos').select('*').order('created_at', { ascending: false })
    if (!user.is_admin) {
      query.eq('is_published', true)
    }

    const { data, error } = await query
    if (error) {
      return { statusCode: 500, body: JSON.stringify({ message: error.message }) }
    }

    // Get uploader avatars from members table
    const uploaderIds = [...new Set(data?.map(v => v.uploaded_by).filter(Boolean) || [])]
    const { data: members } = await supabase
      .from('members')
      .select('discord_id, discord_avatar')
      .in('discord_id', uploaderIds)

    const avatarMap = new Map(members?.map(m => [m.discord_id, m.discord_avatar]) || [])
    
    const videosWithAvatars = data?.map(video => ({
      ...video,
      uploader_avatar: avatarMap.get(video.uploaded_by) || null
    })) || []

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videos: videosWithAvatars }),
    }
  }

  // POST - Create video (any authenticated user can upload)
  if (method === 'POST') {
    // Any authenticated member can upload videos

    const body = JSON.parse(event.body || '{}')
    const { 
      title, 
      description, 
      season, 
      day, 
      wins_attacks, 
      arena_time, 
      shield_hits, 
      overtime_type, 
      start_rank, 
      end_rank, 
      has_commentary 
    } = body

    if (!title) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Title is required' }) }
    }

    // Create TUS upload URL from Cloudflare Stream
    const fileSize = body.fileSize || 10737418240 // Use actual file size if provided
    
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream?direct_user=true`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CF_STREAM_API_TOKEN}`,
          'Tus-Resumable': '1.0.0',
          'Upload-Length': String(fileSize),
          'Upload-Metadata': `name ${Buffer.from(title).toString('base64')}`,
        },
      }
    )
    
    console.log('Cloudflare response status:', response.status)
    console.log('Upload URL:', response.headers.get('location'))

    const uploadUrl = response.headers.get('location')
    const streamMediaId = response.headers.get('stream-media-id')

    if (!uploadUrl || !streamMediaId) {
      return { statusCode: 500, body: JSON.stringify({ message: 'Failed to create upload' }) }
    }

    // Save video to database
    const { data, error } = await supabase
      .from('videos')
      .insert({
        title,
        description,
        stream_uid: streamMediaId,
        is_published: false,
        season,
        day,
        wins_attacks,
        arena_time,
        shield_hits,
        overtime_type,
        start_rank,
        end_rank,
        has_commentary,
        uploaded_by: user.discord_id,
        uploader_name: user.username,
      })
      .select()
      .single()

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ message: error.message }) }
    }

    // Get user avatar from members table
    const { data: memberData } = await supabase
      .from('members')
      .select('avatar')
      .eq('discord_id', user.discord_id)
      .single()
    
    // Send notification to admin about new upload pending review
    const uploadFields = []
    if (season) uploadFields.push({ name: 'Season', value: season, inline: true })
    if (day) uploadFields.push({ name: 'Day', value: day, inline: true })
    if (wins_attacks) uploadFields.push({ name: 'Wins/Attacks', value: wins_attacks, inline: true })
    if (arena_time) uploadFields.push({ name: 'Arena Time', value: arena_time, inline: true })
    
    await sendDiscordNotification(
      '📤 New Video Upload - Pending Review',
      `**${title}**\n\nUploaded by <@${user.discord_id}>`,
      uploadFields,
      {
        avatarUrl: memberData?.avatar || undefined,
        authorName: user.username
      }
    )

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video: data, uploadUrl }),
    }
  }

  // PATCH - Update video (publish/unpublish or edit metadata)
  if (method === 'PATCH') {
    const body = JSON.parse(event.body || '{}')
    const { id, is_published, title, description, season, day, wins_attacks, arena_time, shield_hits, overtime_type, start_rank, end_rank, has_commentary, uploaded_by, uploader_name } = body

    // Check if video exists and get owner
    const { data: existingVideo } = await supabase
      .from('videos')
      .select('uploaded_by')
      .eq('id', id)
      .single()

    if (!existingVideo) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Video not found' }) }
    }

    const isOwner = existingVideo.uploaded_by === user.discord_id
    const isAdmin = user.is_admin

    // Only admin or owner can edit
    if (!isAdmin && !isOwner) {
      return { statusCode: 403, body: JSON.stringify({ message: 'Forbidden' }) }
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {}
    
    // Admin-only fields: is_published, title, uploaded_by, uploader_name
    if (isAdmin) {
      if (is_published !== undefined) updateData.is_published = is_published
      if (title !== undefined) updateData.title = title
      if (uploaded_by !== undefined) updateData.uploaded_by = uploaded_by
      if (uploader_name !== undefined) updateData.uploader_name = uploader_name
    }
    
    // Fields editable by both admin and owner
    if (description !== undefined) updateData.description = description
    if (season !== undefined) updateData.season = season
    if (day !== undefined) updateData.day = day
    if (wins_attacks !== undefined) updateData.wins_attacks = wins_attacks
    if (arena_time !== undefined) updateData.arena_time = arena_time
    if (shield_hits !== undefined) updateData.shield_hits = shield_hits
    if (overtime_type !== undefined) updateData.overtime_type = overtime_type
    if (start_rank !== undefined) updateData.start_rank = start_rank
    if (end_rank !== undefined) updateData.end_rank = end_rank
    if (has_commentary !== undefined) updateData.has_commentary = has_commentary

    const { data, error } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ message: error.message }) }
    }

    // Send notification if published
    if (is_published) {
      // Get uploader info from members table
      const { data: uploaderData } = await supabase
        .from('members')
        .select('avatar')
        .eq('discord_id', data.uploaded_by)
        .single()
      
      const fields = []
      if (data.season) fields.push({ name: 'Season', value: data.season, inline: true })
      if (data.day) fields.push({ name: 'Day', value: data.day, inline: true })
      if (data.wins_attacks) fields.push({ name: 'Wins/Attacks', value: data.wins_attacks, inline: true })
      if (data.arena_time) fields.push({ name: 'Arena Time', value: data.arena_time, inline: true })
      
      const videoUrl = `${process.env.URL || 'https://arena.regulators.us'}/watch/${data.id}`
      
      await sendDiscordNotification(
        '🎬 New Video Published!',
        `**${data.title}**\n\nUploaded by <@${data.uploaded_by}>`,
        fields,
        {
          avatarUrl: uploaderData?.avatar || undefined,
          videoUrl: videoUrl,
          authorName: data.uploader_name
        }
      )
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video: data }),
    }
  }

  // DELETE - Delete video
  if (method === 'DELETE') {
    if (!user.is_admin) {
      return { statusCode: 403, body: JSON.stringify({ message: 'Forbidden' }) }
    }

    const videoId = event.queryStringParameters?.id
    if (!videoId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Video ID required' }) }
    }

    // Get video to delete from Cloudflare
    const { data: video } = await supabase
      .from('videos')
      .select('stream_uid')
      .eq('id', videoId)
      .single()

    if (video?.stream_uid) {
      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${video.stream_uid}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${CF_STREAM_API_TOKEN}` },
        }
      )
    }

    await supabase.from('videos').delete().eq('id', videoId)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    }
  }

  return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) }
}
