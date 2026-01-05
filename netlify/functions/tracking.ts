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

async function getNotificationSettings() {
  const { data } = await supabase
    .from('settings')
    .select('*')
    .single()

  return {
    notifyNewSession: data?.notify_new_session ?? true,
    webhookUrl: data?.webhook_security || process.env.DISCORD_WEBHOOK_URL,
  }
}

async function sendNewSessionNotification(session: any, videoId: string, discordId: string) {
  const settings = await getNotificationSettings()
  if (!settings.notifyNewSession || !settings.webhookUrl) return

  // Get video info
  const { data: video } = await supabase
    .from('videos')
    .select('title')
    .eq('id', videoId)
    .single()

  // Get member info
  const { data: member } = await supabase
    .from('members')
    .select('discord_username, game_id')
    .eq('discord_id', discordId)
    .single()

  // Count how many times this member has watched this specific video
  const { count: memberVideoViews } = await supabase
    .from('view_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('discord_id', discordId)
    .eq('video_id', videoId)
    .gte('watch_seconds', 3)

  // Format location with city and country
  const location = session.city ? `${session.city}, ${session.country}` : session.country || 'Unknown'

  await fetch(settings.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: '👁️ New Watch Session Started',
        fields: [
          { name: 'Member', value: `<@${discordId}>`, inline: true },
          { name: 'Country', value: location, inline: true },
          { name: 'Video', value: video?.title || 'Unknown', inline: false },
          { name: 'Video Views', value: `${memberVideoViews || 0} views`, inline: true },
        ],
        color: 0x3498DB,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'RGR - Arena Run'
        }
      }],
    }),
  }).catch(err => console.error('Failed to send new session notification:', err))
}

export const handler: Handler = async (event) => {
  const user = getUser(event)
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) }
  }

  const body = JSON.parse(event.body || '{}')
  const { sessionId, sessionData, watchSeconds, action } = body

  // If sessionId exists, verify it belongs to user
  let session = null
  if (sessionId) {
    const { data } = await supabase
      .from('view_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('discord_id', user.discord_id)
      .single()
    session = data
  }

  if (action === 'end') {
    // End session if it exists
    if (sessionId && session) {
      await supabase
        .from('view_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionId)
    }
  } else if (watchSeconds !== undefined) {
    // Create session when user watches 3+ seconds (only once)
    if (watchSeconds >= 3 && !session && sessionData) {
      // Create the session
      const { data: newSession, error: sessionError } = await supabase
        .from('view_sessions')
        .insert({
          video_id: sessionData.video_id,
          discord_id: sessionData.discord_id,
          watermark_code: sessionData.watermark_code,
          ip_address: sessionData.ip_address,
          country: sessionData.country,
          city: sessionData.city,
          is_vpn: sessionData.is_vpn,
          isp: sessionData.isp,
          user_agent: sessionData.user_agent,
          watch_seconds: watchSeconds,
        })
        .select()
        .single()

      if (!sessionError && newSession) {
        // Increment view count
        await supabase.rpc('increment_views', { vid: sessionData.video_id })
        // Send new session notification
        await sendNewSessionNotification(newSession, sessionData.video_id, user.discord_id)
        // Return the new session ID
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true, sessionId: newSession.id }),
        }
      }
    } else if (session) {
      // Update existing session watch time
      await supabase
        .from('view_sessions')
        .update({ watch_seconds: watchSeconds })
        .eq('id', sessionId)
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true }),
  }
}
