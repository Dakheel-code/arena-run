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

  // Get date range from query params
  const startDate = event.queryStringParameters?.start
  const endDate = event.queryStringParameters?.end || new Date().toISOString()

  // Get total views from videos
  const { data: videos } = await supabase
    .from('videos')
    .select('views_count, likes_count, created_at, title, is_published')

  const totalViews = videos?.reduce((sum, v) => sum + (v.views_count || 0), 0) || 0
  const totalLikes = videos?.reduce((sum, v) => sum + (v.likes_count || 0), 0) || 0
  const publishedVideos = videos?.filter(v => v.is_published).length || 0

  // Get active members (logged in within last 6 months)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  
  const { count: activeMembers } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .gte('last_login', sixMonthsAgo.toISOString())

  // Get total members
  const { count: totalMembers } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })

  // Get total videos
  const { count: totalVideos } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })

  // Get today's views
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count: todayViews } = await supabase
    .from('view_sessions')
    .select('*', { count: 'exact', head: true })
    .gte('started_at', today.toISOString())

  // Get this week's views
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const { count: weekViews } = await supabase
    .from('view_sessions')
    .select('*', { count: 'exact', head: true })
    .gte('started_at', weekAgo.toISOString())

  // Get total watch time
  const { data: watchTimeData } = await supabase
    .from('view_sessions')
    .select('watch_seconds')
  const totalWatchTime = watchTimeData?.reduce((sum, s) => sum + (s.watch_seconds || 0), 0) || 0

  // Get top videos (most viewed) - need to fetch with id
  const { data: allVideos } = await supabase
    .from('videos')
    .select('id, title, views_count, likes_count')
    .order('views_count', { ascending: false })
    .limit(5)

  const topVideos = allVideos?.map(v => ({ 
    id: v.id,
    title: v.title, 
    views: v.views_count || 0, 
    likes: v.likes_count || 0 
  })) || []

  // Get recent sessions with video titles
  const { data: rawSessions } = await supabase
    .from('view_sessions')
    .select('*, videos(title)')
    .order('started_at', { ascending: false })
    .limit(20)

  // Get member names for sessions
  const discordIds = [...new Set(rawSessions?.map(s => s.discord_id) || [])]
  const { data: membersData } = await supabase
    .from('members')
    .select('discord_id, discord_username, game_id')
    .in('discord_id', discordIds)

  const memberMap = new Map(membersData?.map(m => [m.discord_id, m]) || [])
  
  const recentSessions = rawSessions?.map(s => ({
    ...s,
    member_name: memberMap.get(s.discord_id)?.discord_username || memberMap.get(s.discord_id)?.game_id || s.discord_id.slice(0, 8) + '...'
  })) || []

  // Get new members this month
  const monthAgo = new Date()
  monthAgo.setMonth(monthAgo.getMonth() - 1)
  const { count: newMembersThisMonth } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', monthAgo.toISOString())

  // Get period-specific stats if date range provided
  let periodViews = 0
  let periodWatchTime = 0
  let periodSessions = 0

  if (startDate) {
    let query = supabase
      .from('view_sessions')
      .select('watch_seconds')
      .gte('started_at', startDate)
      .lte('started_at', endDate)

    const { data: periodData, count } = await query

    periodSessions = count || periodData?.length || 0
    periodWatchTime = periodData?.reduce((sum, s) => sum + (s.watch_seconds || 0), 0) || 0
    periodViews = periodSessions
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      totalViews,
      totalLikes,
      totalMembers: totalMembers || 0,
      activeMembers: activeMembers || 0,
      totalVideos: totalVideos || 0,
      publishedVideos,
      todayViews: todayViews || 0,
      weekViews: weekViews || 0,
      totalWatchTime,
      topVideos,
      newMembersThisMonth: newMembersThisMonth || 0,
      recentSessions: recentSessions || [],
      periodViews,
      periodWatchTime,
      periodSessions,
    }),
  }
}
