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

function generateWatermarkCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  code += '-'
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

async function createSignedPlaybackToken(videoUid: string): Promise<string> {
  // Get signing keys from Cloudflare
  const keysResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/keys`,
    {
      headers: { Authorization: `Bearer ${CF_STREAM_API_TOKEN}` },
    }
  )
  const keysData = await keysResponse.json()
  
  let keyId: string
  let pem: string

  if (keysData.result && keysData.result.length > 0) {
    keyId = keysData.result[0].id
    pem = keysData.result[0].pem
  } else {
    // Create a new key if none exists
    const createKeyResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/keys`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${CF_STREAM_API_TOKEN}` },
      }
    )
    const newKey = await createKeyResponse.json()
    keyId = newKey.result.id
    pem = newKey.result.pem
  }

  // Create signed token (valid for 1 hour)
  const crypto = require('crypto')
  const expiry = Math.floor(Date.now() / 1000) + 3600

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: keyId })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    sub: videoUid,
    kid: keyId,
    exp: expiry,
    accessRules: [{ type: 'any', action: 'allow' }],
  })).toString('base64url')

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const signature = sign.sign(pem, 'base64url')

  return `${header}.${payload}.${signature}`
}

export const handler: Handler = async (event) => {
  const user = getUser(event)
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) }
  }

  const videoId = event.queryStringParameters?.videoId
  if (!videoId) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Video ID required' }) }
  }

  // Get video
  const { data: video, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single()

  if (error || !video) {
    return { statusCode: 404, body: JSON.stringify({ message: 'Video not found' }) }
  }

  // Generate watermark code
  const watermarkCode = generateWatermarkCode()

  // Get client info for session creation later
  const ip = event.headers['x-forwarded-for']?.split(',')[0] || event.headers['client-ip'] || event.headers['x-real-ip'] || 'unknown'
  const userAgent = event.headers['user-agent'] || 'unknown'

  // Get country, city, and VPN/proxy info from GeoIP service
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
  if (!country) {
    country = 'Unknown'
  }

  // Return stream UID and session data (session will be created when user watches 3+ seconds)
  const token = video.stream_uid

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      token, 
      sessionData: {
        video_id: videoId,
        discord_id: user.discord_id,
        watermark_code: watermarkCode,
        ip_address: ip,
        country,
        city,
        is_vpn: isVpn,
        isp,
        user_agent: userAgent,
      }
    }),
  }
}

async function getNotificationSettings() {
  const { data } = await supabase
    .from('settings')
    .select('*')
    .single()

  return {
    notifyCountryChange: data?.notify_country_change ?? true,
    notifyIpChange: data?.notify_ip_change ?? true,
    notifyExcessiveViews: data?.notify_excessive_views ?? true,
    excessiveViewsThreshold: data?.excessive_views_threshold ?? 5,
    excessiveViewsInterval: data?.excessive_views_interval ?? 10,
    notifySuspiciousActivity: data?.notify_suspicious_activity ?? true,
    notifyVpnProxy: data?.notify_vpn_proxy ?? true,
    notifyMultipleDevices: data?.notify_multiple_devices ?? true,
    notifyOddHours: data?.notify_odd_hours ?? false,
    oddHoursStart: data?.odd_hours_start ?? 2,
    oddHoursEnd: data?.odd_hours_end ?? 6,
    webhookUrl: data?.webhook_security || process.env.DISCORD_WEBHOOK_URL,
    notifyNewSession: data?.notify_new_session ?? true,
  }
}

async function checkSecurityAlerts(discordId: string, country: string, ip: string, videoId: string, userAgent: string) {
  const settings = await getNotificationSettings()

  // Check for country change in last 24 hours
  if (settings.notifyCountryChange) {
    const { data: recentCountrySessions } = await supabase
      .from('view_sessions')
      .select('country')
      .eq('discord_id', discordId)
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .neq('country', country)
      .limit(1)

    if (recentCountrySessions && recentCountrySessions.length > 0) {
      await supabase.from('alerts').insert({
        type: 'country_change',
        severity: 'medium',
        discord_id: discordId,
        details: { old_country: recentCountrySessions[0].country, new_country: country },
      })

      if (settings.webhookUrl) {
        await fetch(settings.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '🌍 Country Change Alert',
              description: `User <@${discordId}> changed country from **${recentCountrySessions[0].country}** to **${country}**`,
              color: 0xFFA500,
              timestamp: new Date().toISOString(),
            }],
          }),
        })
      }
    }
  }

  // Check for IP change in last 24 hours
  if (settings.notifyIpChange) {
    const { data: recentIpSessions } = await supabase
      .from('view_sessions')
      .select('ip_address')
      .eq('discord_id', discordId)
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .neq('ip_address', ip)
      .limit(1)

    if (recentIpSessions && recentIpSessions.length > 0) {
      await supabase.from('alerts').insert({
        type: 'suspicious_activity',
        severity: 'low',
        discord_id: discordId,
        details: { old_ip: recentIpSessions[0].ip_address, new_ip: ip, reason: 'ip_change' },
      })

      if (settings.webhookUrl) {
        await fetch(settings.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '📡 IP Change Alert',
              description: `User <@${discordId}> changed IP address`,
              fields: [
                { name: 'Previous IP', value: `||${recentIpSessions[0].ip_address}||`, inline: true },
                { name: 'New IP', value: `||${ip}||`, inline: true },
              ],
              color: 0x3498DB,
              timestamp: new Date().toISOString(),
            }],
          }),
        })
      }
    }
  }

  // Check for excessive views
  if (settings.notifyExcessiveViews) {
    const { count } = await supabase
      .from('view_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('discord_id', discordId)
      .eq('video_id', videoId)
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    // Only send alert if count exceeds threshold AND is at the interval
    // e.g., threshold=5, interval=10 -> alerts at 5, 15, 25, 35...
    // Or if interval=5 -> alerts at 5, 10, 15, 20...
    const exceedsThreshold = count && count >= settings.excessiveViewsThreshold
    const isAtInterval = count && (count - settings.excessiveViewsThreshold) % settings.excessiveViewsInterval === 0
    
    if (exceedsThreshold && isAtInterval) {
      await supabase.from('alerts').insert({
        type: 'excessive_views',
        severity: 'low',
        discord_id: discordId,
        details: { video_id: videoId, view_count: count, threshold: settings.excessiveViewsThreshold },
      })

      if (settings.webhookUrl) {
        // Get video title
        const { data: video } = await supabase
          .from('videos')
          .select('title')
          .eq('id', videoId)
          .single()

        await fetch(settings.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '🔄 Excessive Views Alert',
              description: `User <@${discordId}> watched the same video **${count}** times in 24 hours`,
              fields: [
                { name: 'Video', value: video?.title || videoId, inline: true },
                { name: 'Threshold', value: `${settings.excessiveViewsThreshold}`, inline: true },
                { name: 'Next Alert', value: `At ${count + settings.excessiveViewsInterval} views`, inline: true },
              ],
              color: 0x9B59B6,
              timestamp: new Date().toISOString(),
            }],
          }),
        })
      }
    }
  }

  // Check for VPN/Proxy usage
  if (settings.notifyVpnProxy && settings.notifySuspiciousActivity) {
    try {
      const vpnCheckResponse = await fetch(`http://ip-api.com/json/${ip}?fields=proxy,hosting`)
      const vpnData = await vpnCheckResponse.json()
      
      if (vpnData.proxy || vpnData.hosting) {
        await supabase.from('alerts').insert({
          type: 'suspicious_activity',
          severity: 'high',
          discord_id: discordId,
          details: { ip, reason: 'vpn_proxy_detected', is_proxy: vpnData.proxy, is_hosting: vpnData.hosting },
        })

        if (settings.webhookUrl) {
          await fetch(settings.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              embeds: [{
                title: '🛡️ VPN/Proxy Detected',
                description: `User <@${discordId}> is using a VPN or Proxy`,
                fields: [
                  { name: 'IP', value: `||${ip}||`, inline: true },
                  { name: 'Type', value: vpnData.proxy ? 'Proxy' : 'Hosting/VPN', inline: true },
                ],
                color: 0xE74C3C,
                timestamp: new Date().toISOString(),
              }],
            }),
          })
        }
      }
    } catch (err) {
      console.error('VPN check failed:', err)
    }
  }

  // Check for multiple devices (same user, different user agents, within 5 minutes)
  if (settings.notifyMultipleDevices && settings.notifySuspiciousActivity) {
    const { data: recentDeviceSessions } = await supabase
      .from('view_sessions')
      .select('user_agent, ip_address')
      .eq('discord_id', discordId)
      .gte('started_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .neq('user_agent', userAgent)

    if (recentDeviceSessions && recentDeviceSessions.length > 0) {
      // Get unique user agents
      const uniqueAgents = new Set(recentDeviceSessions.map(s => s.user_agent))
      uniqueAgents.add(userAgent)
      
      if (uniqueAgents.size > 1) {
        await supabase.from('alerts').insert({
          type: 'suspicious_activity',
          severity: 'high',
          discord_id: discordId,
          details: { 
            reason: 'multiple_devices', 
            device_count: uniqueAgents.size,
            current_agent: userAgent,
          },
        })

        if (settings.webhookUrl) {
          await fetch(settings.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              embeds: [{
                title: '📱 Multiple Devices Alert',
                description: `User <@${discordId}> is watching from **${uniqueAgents.size}** different devices simultaneously`,
                fields: [
                  { name: 'Time Window', value: '5 minutes', inline: true },
                ],
                color: 0xE74C3C,
                timestamp: new Date().toISOString(),
              }],
            }),
          })
        }
      }
    }
  }

  // Check for odd hours activity
  if (settings.notifyOddHours && settings.notifySuspiciousActivity) {
    const currentHour = new Date().getUTCHours()
    const isOddHour = currentHour >= settings.oddHoursStart && currentHour < settings.oddHoursEnd
    
    if (isOddHour) {
      await supabase.from('alerts').insert({
        type: 'suspicious_activity',
        severity: 'low',
        discord_id: discordId,
        details: { reason: 'odd_hours', hour: currentHour, video_id: videoId },
      })

      if (settings.webhookUrl) {
        await fetch(settings.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '🌙 Odd Hours Activity',
              description: `User <@${discordId}> is watching at an unusual hour`,
              fields: [
                { name: 'Current Hour (UTC)', value: `${currentHour}:00`, inline: true },
                { name: 'Odd Hours Range', value: `${settings.oddHoursStart}:00 - ${settings.oddHoursEnd}:00`, inline: true },
              ],
              color: 0x9B59B6,
              timestamp: new Date().toISOString(),
            }],
          }),
        })
      }
    }
  }
}
