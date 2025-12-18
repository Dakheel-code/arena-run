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
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) }
  }

  const body = JSON.parse(event.body || '{}')
  const { sessionId, watchSeconds, action } = body

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

  if (action === 'end') {
    // End session
    await supabase
      .from('view_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)
  } else if (watchSeconds !== undefined) {
    // Update watch time
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
