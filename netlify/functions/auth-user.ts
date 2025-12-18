import type { Handler } from '@netlify/functions'

const JWT_SECRET = process.env.JWT_SECRET!

function verifyToken(token: string): { valid: boolean; payload?: any } {
  try {
    const [header, body, signature] = token.split('.')
    const crypto = require('crypto')
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
    
    if (signature !== expectedSig) {
      return { valid: false }
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    
    if (payload.exp < Date.now()) {
      return { valid: false }
    }

    return { valid: true, payload }
  } catch {
    return { valid: false }
  }
}

export const handler: Handler = async (event) => {
  const authHeader = event.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthorized' }),
    }
  }

  const token = authHeader.slice(7)
  const { valid, payload } = verifyToken(token)

  if (!valid) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Invalid token' }),
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: {
        id: payload.discord_id,
        discord_id: payload.discord_id,
        username: payload.username,
        avatar: payload.avatar,
        game_id: payload.game_id,
        is_admin: payload.is_admin,
      },
    }),
  }
}
