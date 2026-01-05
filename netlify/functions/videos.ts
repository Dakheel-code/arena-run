import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!
const CF_STREAM_API_TOKEN = process.env.CF_STREAM_API_TOKEN!
const JWT_SECRET = process.env.JWT_SECRET!
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!
const CHANNEL_UPLOADS = process.env.CHANNEL_UPLOADS

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

async function updateVideoDuration(videoId: string, streamUid: string) {
  try {
    const videoInfo = await getVideoInfoFromCloudflare(streamUid)
    
    if (videoInfo && videoInfo.duration) {
      const duration = Math.round(videoInfo.duration)
      
      await supabase
        .from('videos')
        .update({ duration })
        .eq('id', videoId)
      
      console.log(`✓ Updated video ${videoId} duration: ${duration}s`)
      return duration
    }
    
    console.log(`✗ No duration available for video ${videoId}`)
    return null
  } catch (error) {
    console.error(`Error updating duration for video ${videoId}:`, error)
    return null
  }
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
  console.log('🔔 Attempting to send notification:', title)
  console.log('📋 Bot Token:', DISCORD_BOT_TOKEN ? 'SET' : 'MISSING')
  console.log('📋 Channel:', CHANNEL_UPLOADS || 'MISSING')
  
  // Get notification settings
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('notify_new_upload, notify_new_publish, webhook_url')
    .maybeSingle()
  
  console.log('⚙️ Settings:', settings)
  console.log('⚙️ Settings Error:', settingsError)
  
  // Check if notifications are enabled
  const isUploadNotification = title.includes('Upload')
  const isPublishNotification = title.includes('Published')
  
  console.log('📤 Is Upload:', isUploadNotification, '- Enabled:', settings?.notify_new_upload)
  console.log('🎬 Is Publish:', isPublishNotification, '- Enabled:', settings?.notify_new_publish)
  
  if (isUploadNotification && settings && !settings.notify_new_upload) {
    console.log('⏭️ Upload notifications disabled, skipping')
    return
  }
  if (isPublishNotification && settings && !settings.notify_new_publish) {
    console.log('⏭️ Publish notifications disabled, skipping')
    return
  }
  
  const embed: any = {
    title,
    description,
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
        label: '▶️ Watch Video',
        url: options.videoUrl
      }]
    }]
  }
  
  // Add role mention for new uploads
  const isUploadNotif = title.includes('Upload')
  if (isUploadNotif) {
    payload.content = '<@&1428664396145754203>' // @ARENA RUN TEAM role mention
    payload.allowed_mentions = {
      parse: [],
      roles: ['1428664396145754203'],
      users: options?.discordId ? [options.discordId] : []
    }
  } else if (options?.discordId) {
    // Add allowed mentions if discord ID provided (for non-upload notifications)
    payload.allowed_mentions = {
      parse: [],
      users: [options.discordId]
    }
  }

  // Send via Discord Bot API (if configured)
  const canUseBot = !!(DISCORD_BOT_TOKEN && CHANNEL_UPLOADS)
  if (canUseBot) {
    try {
      const response = await fetch(
        `https://discord.com/api/v10/channels/${CHANNEL_UPLOADS}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )
      
      if (response.ok) {
        console.log('✅ Notification sent via Discord Bot to primary channel')
        
        // Send to second channel for new uploads
        if (isUploadNotif) {
          const secondChannelId = '984981028454162492'
          try {
            await fetch(
              `https://discord.com/api/v10/channels/${secondChannelId}/messages`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
              }
            )
            console.log('✅ Notification also sent to second channel')
          } catch (err) {
            console.error('❌ Failed to send to second channel:', err)
          }
        }
        
        return
      }

      const errorText = await response.text()
      console.error('❌ Discord API error:', errorText)
      console.log('↩️ Falling back to webhook (if configured)')
    } catch (error) {
      console.error('❌ Failed to send via Discord Bot API:', error)
      console.log('↩️ Falling back to webhook (if configured)')
    }
  } else {
    console.log('⏭️ Bot token/channel missing, falling back to webhook (if configured)')
  }

  const webhookUrl = (settings as any)?.webhook_url || process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) {
    console.error('❌ No webhook_url configured in settings; notification could not be sent')
    return
  }

  try {
    const webhookResp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!webhookResp.ok) {
      const errorText = await webhookResp.text()
      console.error('❌ Webhook error:', errorText)

      if (payload.components) {
        console.log('↩️ Retrying webhook without components')
        const embedWithLink = {
          ...embed,
          description: options?.videoUrl
            ? `${embed.description}\n\n${options.videoUrl}`
            : embed.description,
        }
        const retryPayload: any = {
          ...payload,
          embeds: [embedWithLink],
        }
        delete retryPayload.components

        const retryResp = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(retryPayload),
        })

        if (!retryResp.ok) {
          const retryErrorText = await retryResp.text()
          console.error('❌ Webhook retry error:', retryErrorText)
          return
        }

        console.log('✅ Notification sent via webhook (without components)')
        return
      }
      return
    }

    console.log('✅ Notification sent via webhook')
  } catch (error) {
    console.error('❌ Failed to send via webhook:', error)
  }
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

    // Get uploader's discord_global_name from members table
    const { data: member } = await supabase
      .from('members')
      .select('discord_global_name, discord_username')
      .eq('discord_id', user.discord_id)
      .single()
    
    const uploaderName = member?.discord_global_name || member?.discord_username || user.username

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
        uploader_name: uploaderName,
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
        discordId: user.discord_id,
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
      if (uploader_name !== undefined) {
        updateData.uploader_name = uploader_name
        
        // Update title if it contains the old uploader name
        const { data: currentVideo } = await supabase
          .from('videos')
          .select('title, uploader_name')
          .eq('id', id)
          .single()
        
        if (currentVideo && currentVideo.uploader_name && currentVideo.title) {
          const oldName = currentVideo.uploader_name
          const newName = uploader_name
          
          // If title starts with old uploader name, replace it with new name (case-insensitive check)
          if (currentVideo.title.toLowerCase().startsWith(oldName.toLowerCase())) {
            const rest = currentVideo.title.slice(oldName.length)
            updateData.title = newName + rest
          }
        }
      }
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

    // Update duration if missing or invalid when publishing
    if (is_published && data.stream_uid && (!data.duration || data.duration < 0)) {
      console.log(`Attempting to update duration for video ${data.id} before publishing`)
      await updateVideoDuration(data.id, data.stream_uid)
      
      // Fetch updated video data
      const { data: updatedVideo } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single()
      
      if (updatedVideo) {
        Object.assign(data, updatedVideo)
      }
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
      
      const videoUrl = `${process.env.URL || 'https://arena.regulators.us'}/app/watch/${data.id}`
      
      await sendDiscordNotification(
        '🎬 New Video Published!',
        `**${data.title}**\n\nUploaded by <@${data.uploaded_by}>`,
        fields,
        {
          discordId: data.uploaded_by,
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
