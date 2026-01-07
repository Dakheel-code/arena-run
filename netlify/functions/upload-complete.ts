import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

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

async function sendDiscordNotification(
  title: string,
  description: string,
  fields?: Array<{ name: string; value: string; inline?: boolean }>,
  options?: {
    discordId?: string
    avatarUrl?: string
    videoUrl?: string
  }
) {
  // Get notification settings
  const { data: settings } = await supabase
    .from('settings')
    .select('notify_new_upload, webhook_url')
    .maybeSingle()

  if (settings && settings.notify_new_upload === false) {
    return
  }

  const embed: any = {
    title,
    description,
    color: 0xF59E0B,
    fields: fields || [],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'RGR - Arena Run',
    },
  }

  if (options?.avatarUrl) {
    embed.image = {
      url: options.avatarUrl,
    }
  }

  const payload: any = {
    embeds: [embed],
  }

  // Mention role for upload notifications
  payload.content = '<@&1428664396145754203>'
  payload.allowed_mentions = {
    parse: [],
    roles: ['1428664396145754203'],
    users: options?.discordId ? [options.discordId] : [],
  }

  if (options?.videoUrl) {
    payload.components = [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: '▶️ Watch Video',
            url: options.videoUrl,
          },
        ],
      },
    ]
  }

  // Send via bot first
  const canUseBot = !!(DISCORD_BOT_TOKEN && CHANNEL_UPLOADS)
  if (canUseBot) {
    const resp = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_UPLOADS}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (resp.ok) {
      // Mirror to second channel
      const secondChannelId = '984981028454162492'
      try {
        await fetch(`https://discord.com/api/v10/channels/${secondChannelId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      } catch {
        // ignore
      }

      return
    }
  }

  const webhookUrl = (settings as any)?.webhook_url || process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) return

  await fetch(webhookUrl, {
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

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { videoId } = body

    if (!videoId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Video ID required' }) }
    }

    const { data: video } = await supabase
      .from('videos')
      .select('id, title, season, day, wins_attacks, arena_time, uploaded_by')
      .eq('id', videoId)
      .single()

    if (!video) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Video not found' }) }
    }

    const isOwner = video.uploaded_by === user.discord_id
    const isAdmin = user.is_admin

    if (!isOwner && !isAdmin) {
      return { statusCode: 403, body: JSON.stringify({ message: 'Forbidden' }) }
    }

    // Get uploader avatar
    const { data: memberData } = await supabase
      .from('members')
      .select('avatar')
      .eq('discord_id', video.uploaded_by)
      .single()

    const uploadFields: Array<{ name: string; value: string; inline?: boolean }> = []
    if (video.season) uploadFields.push({ name: 'Season', value: video.season, inline: true })
    if (video.day) uploadFields.push({ name: 'Day', value: video.day, inline: true })
    if (video.wins_attacks) uploadFields.push({ name: 'Wins/Attacks', value: video.wins_attacks, inline: true })
    if (video.arena_time) uploadFields.push({ name: 'Arena Time', value: video.arena_time, inline: true })

    const videoUrl = `${process.env.URL || 'https://arena.regulators.us'}/app/watch/${video.id}`

    await sendDiscordNotification(
      '📤 New Video Upload - Pending Review',
      `**${video.title}**\n\nUploaded by <@${video.uploaded_by}>`,
      uploadFields,
      {
        discordId: video.uploaded_by,
        avatarUrl: memberData?.avatar || undefined,
        videoUrl,
      }
    )

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message || 'Internal server error' }),
    }
  }
}
