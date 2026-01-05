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
        .order('logged_at', { ascending: false })

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

      // Get member info for all logs to fetch discord_global_name
      const discordIds = [...new Set(data?.map(log => log.discord_id) || [])]
      const { data: members } = await supabase
        .from('members')
        .select('discord_id, discord_global_name, discord_username')
        .in('discord_id', discordIds)

      // Create a map for quick lookup
      const memberMap = new Map(members?.map(m => [m.discord_id, m]) || [])

      // Merge member info with logs (prioritize discord_global_name from members table)
      const logsWithMemberNames = data?.map(log => ({
        ...log,
        discord_username: memberMap.get(log.discord_id)?.discord_global_name || 
                         memberMap.get(log.discord_id)?.discord_username || 
                         log.discord_username
      })) || []

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsWithMemberNames,
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
