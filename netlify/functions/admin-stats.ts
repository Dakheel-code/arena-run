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

  // Get total views from view_sessions (count all sessions)
  const { count: totalViews } = await supabase
    .from('view_sessions')
    .select('*', { count: 'exact', head: true })

  // Get total likes from videos
  const { data: videos } = await supabase
    .from('videos')
    .select('likes_count, is_published')

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

  // Get top videos (most viewed) - count actual view sessions per video
  const { data: allViewSessions } = await supabase
    .from('view_sessions')
    .select('video_id')

  // Count views per video
  const videoViewCounts = new Map<string, number>()
  allViewSessions?.forEach((session: any) => {
    const count = videoViewCounts.get(session.video_id) || 0
    videoViewCounts.set(session.video_id, count + 1)
  })

  // Get top 10 video IDs by view count
  const topVideoIds = Array.from(videoViewCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id)

  // Fetch video details for top videos
  const { data: topVideosData } = await supabase
    .from('videos')
    .select('id, title, likes_count')
    .in('id', topVideoIds.length > 0 ? topVideoIds : ['none'])

  // Build top videos array with actual view counts
  const topVideos = topVideoIds.map(videoId => {
    const video = topVideosData?.find(v => v.id === videoId)
    return {
      id: videoId,
      title: video?.title || 'Unknown',
      views: videoViewCounts.get(videoId) || 0,
      likes: video?.likes_count || 0
    }
  })

  // Get recent sessions with video titles
  const { data: rawSessions } = await supabase
    .from('view_sessions')
    .select('*, videos(title)')
    .order('started_at', { ascending: false })
    .limit(20)

  // Get member names and avatars for sessions
  const discordIds = [...new Set(rawSessions?.map(s => s.discord_id) || [])]
  const { data: membersData } = await supabase
    .from('members')
    .select('discord_id, discord_username, discord_global_name, game_id, discord_avatar')
    .in('discord_id', discordIds.length > 0 ? discordIds : ['none'])

  const memberMap = new Map(membersData?.map(m => [m.discord_id, m]) || [])
  
  const recentSessions = rawSessions?.map(s => {
    const member = memberMap.get(s.discord_id)
    return {
      ...s,
      member_name: member?.discord_global_name || member?.discord_username || member?.game_id || s.discord_id.slice(0, 8) + '...',
      member_avatar: member?.discord_avatar
    }
  }) || []

  // Get new members this month
  const monthAgo = new Date()
  monthAgo.setMonth(monthAgo.getMonth() - 1)
  const { count: newMembersThisMonth } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', monthAgo.toISOString())

  // Get top viewers (most sessions) and top watch time
  const { data: allSessions } = await supabase
    .from('view_sessions')
    .select('discord_id, watch_seconds')

  // Aggregate stats by discord_id
  const viewerStats = new Map<string, { sessions: number, watchTime: number }>()
  allSessions?.forEach((s: any) => {
    const existing = viewerStats.get(s.discord_id)
    if (existing) {
      existing.sessions++
      existing.watchTime += s.watch_seconds || 0
    } else {
      viewerStats.set(s.discord_id, { 
        sessions: 1, 
        watchTime: s.watch_seconds || 0
      })
    }
  })

  // Get top 10 discord_ids for both categories
  const sortedBySession = Array.from(viewerStats.entries())
    .sort((a, b) => b[1].sessions - a[1].sessions)
    .slice(0, 10)
  
  const sortedByWatchTime = Array.from(viewerStats.entries())
    .sort((a, b) => b[1].watchTime - a[1].watchTime)
    .slice(0, 10)

  // Get all unique discord_ids we need member info for
  const allDiscordIds = [...new Set([
    ...sortedBySession.map(([id]) => id),
    ...sortedByWatchTime.map(([id]) => id)
  ])]

  // Fetch member info for these discord_ids
  const { data: allMembersData } = await supabase
    .from('members')
    .select('discord_id, discord_username, discord_global_name, game_id, discord_avatar')
    .in('discord_id', allDiscordIds.length > 0 ? allDiscordIds : ['none'])

  const memberInfoMap = new Map(allMembersData?.map(m => [m.discord_id, m]) || [])

  // Build top viewers list (top 10)
  const topViewers = sortedBySession.slice(0, 10).map(([id, data]) => {
    const member = memberInfoMap.get(id)
    return {
      id,
      name: member?.discord_global_name || member?.discord_username || member?.game_id || id.slice(0, 8) + '...',
      avatar: member?.discord_avatar,
      count: data.sessions
    }
  })

  // Build top watch time list (top 10)
  const topWatchTime = sortedByWatchTime.slice(0, 10).map(([id, data]) => {
    const member = memberInfoMap.get(id)
    return {
      id,
      name: member?.discord_global_name || member?.discord_username || member?.game_id || id.slice(0, 8) + '...',
      avatar: member?.discord_avatar,
      seconds: data.watchTime
    }
  })

  // Get top countries by unique members
  const { data: allSessionsWithCountry } = await supabase
    .from('view_sessions')
    .select('discord_id, country')
    .not('country', 'is', null)

  // Count unique members per country
  const countryMemberMap = new Map<string, Set<string>>()
  allSessionsWithCountry?.forEach((session: any) => {
    if (session.country && session.country !== 'Unknown') {
      if (!countryMemberMap.has(session.country)) {
        countryMemberMap.set(session.country, new Set())
      }
      countryMemberMap.get(session.country)!.add(session.discord_id)
    }
  })

  // Get all unique discord_ids from all countries
  const allCountryDiscordIds = [...new Set(allSessionsWithCountry?.map(s => s.discord_id) || [])]
  
  // Fetch member info for all discord_ids
  const { data: countryMembersData } = await supabase
    .from('members')
    .select('discord_id, discord_global_name, discord_username, game_id, discord_avatar')
    .in('discord_id', allCountryDiscordIds.length > 0 ? allCountryDiscordIds : ['none'])

  const countryMemberInfoMap = new Map(countryMembersData?.map(m => [m.discord_id, m]) || [])

  // Build top countries list with member details
  const topCountries = Array.from(countryMemberMap.entries())
    .map(([country, memberIds]) => {
      const members = Array.from(memberIds).map(id => {
        const member = countryMemberInfoMap.get(id)
        return {
          id,
          name: member?.discord_global_name || member?.discord_username || member?.game_id || id.slice(0, 8) + '...',
          avatar: member?.discord_avatar
        }
      })
      return {
        country,
        memberCount: memberIds.size,
        members
      }
    })
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 10)

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
      topViewers,
      topWatchTime,
      topCountries,
    }),
  }
}
