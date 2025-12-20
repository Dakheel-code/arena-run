import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function verifyToken(token: string): any {
  try {
    const [header, payload, signature] = token.split('.')
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
    
    if (decoded.exp < Date.now()) {
      throw new Error('Token expired')
    }
    
    return decoded
  } catch (error) {
    return null
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json',
      },
      body: '',
    }
  }

  const authHeader = event.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    }
  }

  const token = authHeader.substring(7)
  const user = verifyToken(token)

  if (!user?.is_admin) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Admin access required' }),
    }
  }

  try {
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {}
      const page = parseInt(params.page || '1')
      const limit = parseInt(params.limit || '50')
      const status = params.status // 'success', 'failed', or undefined for all
      const discord_id = params.discord_id
      const search = params.search

      const offset = (page - 1) * limit

      let query = supabase
        .from('login_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      if (discord_id) {
        query = query.eq('discord_id', discord_id)
      }

      if (search) {
        query = query.or(`discord_username.ilike.%${search}%,discord_id.ilike.%${search}%,email.ilike.%${search}%`)
      }

      const { data, error, count } = await query
        .range(offset, offset + limit - 1)

      if (error) throw error

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: data,
          total: count,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
        }),
      }
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  } catch (error) {
    console.error('Login logs error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
