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

  // GET - List all members
  if (method === 'GET') {
    console.log('Fetching members...')
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('Members result:', { data, error })

    if (error) {
      console.log('Members error:', error)
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
