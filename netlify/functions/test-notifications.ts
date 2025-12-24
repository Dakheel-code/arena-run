import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const JWT_SECRET = process.env.JWT_SECRET!
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const CHANNEL_UPLOADS = process.env.CHANNEL_UPLOADS
const ADMIN_IDS = (process.env.ADMIN_DISCORD_IDS || '').split(',').map((id) => id.trim()).filter(Boolean)

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
  const authHeader = event.headers.authorization || event.headers.Authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const { valid, payload } = verifyToken(authHeader.slice(7))
  return valid ? payload : null
}

function truncate(text: string, max = 600) {
  const s = String(text || '')
  if (s.length <= max) return s
  return s.slice(0, max) + '…'
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) }
  }

  const user = getUser(event)
  if (!user || !ADMIN_IDS.includes(user.discord_id)) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) }
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Supabase env not configured' }) }
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: settings } = await supabase
    .from('settings')
    .select('webhook_url')
    .maybeSingle()

  const webhookUrl = (settings as any)?.webhook_url || process.env.DISCORD_WEBHOOK_URL

  const embed: any = {
    title: '🔧 Test Notification',
    description: `Sent at ${new Date().toISOString()}`,
    color: 0xF59E0B,
    timestamp: new Date().toISOString(),
    footer: { text: 'RGR - Arena Run' },
  }

  const payload: any = {
    embeds: [embed],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: '▶️ Open Site',
            url: `${process.env.URL || 'https://arena.regulators.us'}/app`,
          },
        ],
      },
    ],
  }

  const diagnostics: any = {
    env: {
      bot_token_set: !!DISCORD_BOT_TOKEN,
      channel_uploads_set: !!CHANNEL_UPLOADS,
      webhook_url_set: !!webhookUrl,
    },
    bot: null as any,
    webhook: null as any,
  }

  if (DISCORD_BOT_TOKEN && CHANNEL_UPLOADS) {
    try {
      const resp = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_UPLOADS}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const bodyText = await resp.text()
      diagnostics.bot = {
        ok: resp.ok,
        status: resp.status,
        body: truncate(bodyText),
      }
    } catch (e: any) {
      diagnostics.bot = {
        ok: false,
        error: truncate(e?.message || String(e)),
      }
    }
  } else {
    diagnostics.bot = { ok: false, skipped: true }
  }

  if (webhookUrl) {
    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const bodyText = await resp.text()
      diagnostics.webhook = {
        ok: resp.ok,
        status: resp.status,
        body: truncate(bodyText),
      }

      if (!resp.ok) {
        const retryPayload: any = {
          embeds: [
            {
              ...embed,
              description: `${embed.description}\n\n${process.env.URL || 'https://arena.regulators.us'}/app`,
            },
          ],
        }

        const retryResp = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(retryPayload),
        })

        const retryBodyText = await retryResp.text()
        diagnostics.webhook_retry = {
          ok: retryResp.ok,
          status: retryResp.status,
          body: truncate(retryBodyText),
        }
      }
    } catch (e: any) {
      diagnostics.webhook = {
        ok: false,
        error: truncate(e?.message || String(e)),
      }
    }
  } else {
    diagnostics.webhook = { ok: false, skipped: true }
  }

  const ok = !!(diagnostics.bot?.ok || diagnostics.webhook?.ok || diagnostics.webhook_retry?.ok)

  return {
    statusCode: ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok, diagnostics }),
  }
}
