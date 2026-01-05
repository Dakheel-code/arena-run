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

async function getClientContext(event: any) {
  const ip =
    event.headers['x-forwarded-for']?.split(',')[0] ||
    event.headers['client-ip'] ||
    event.headers['x-real-ip'] ||
    'unknown'
  const userAgent = event.headers['user-agent'] || 'unknown'

  let country: string = ''
  let city: string = event.headers['cf-ipcity'] || ''
  let isVpn: boolean = false
  let isp: string = ''

  if (ip !== 'unknown' && ip !== '127.0.0.1' && ip !== '::1') {
    try {
      const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,proxy,hosting,isp`)
      const geoData = await geoResponse.json()
      country = geoData.country || 'Unknown'
      if (!city) city = geoData.city || ''
      isVpn = geoData.proxy || geoData.hosting || false
      isp = geoData.isp || ''
    } catch {
      country = 'Unknown'
    }
  }
  if (!country) country = 'Unknown'

  return { ip, userAgent, country, city, isVpn, isp }
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
  await supabase
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
  const { sessionId, watchSeconds, action, videoId, watermarkCode } = body

  // End requires an existing session
  if (action === 'end') {
    if (!sessionId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Session ID required' }) }
    }

    // Verify session belongs to user
    const { data: session } = await supabase
      .from('view_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('discord_id', user.discord_id)
      .single()

    if (!session) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Session not found' }) }
    }

    await supabase
      .from('view_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    }
  }

  if (watchSeconds !== undefined) {
    // If session doesn't exist yet, create it only after 3 seconds
    if (!sessionId) {
      if (watchSeconds < 3) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true }),
        }
      }

      if (!videoId || !watermarkCode) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Video ID and watermark code required' }),
        }
      }

      const ctx = await getClientContext(event)

      const { data: newSession, error: sessionError } = await supabase
        .from('view_sessions')
        .insert({
          video_id: videoId,
          discord_id: user.discord_id,
          watermark_code: watermarkCode,
          ip_address: ctx.ip,
          country: ctx.country,
          city: ctx.city,
          is_vpn: ctx.isVpn,
          isp: ctx.isp,
          user_agent: ctx.userAgent,
          watch_seconds: watchSeconds,
        })
        .select()
        .single()

      if (sessionError || !newSession) {
        return { statusCode: 500, body: JSON.stringify({ message: sessionError?.message || 'Failed to create session' }) }
      }

      await supabase.rpc('increment_views', { vid: videoId })
      await sendNewSessionNotification(newSession, videoId, user.discord_id)

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, sessionId: newSession.id }),
      }
    }

    // Update existing session
    const { data: session } = await supabase
      .from('view_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('discord_id', user.discord_id)
      .single()

    if (!session) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Session not found' }) }
    }

    await supabase
      .from('view_sessions')
      .update({ watch_seconds: watchSeconds })
      .eq('id', sessionId)
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true }),
  }
}
