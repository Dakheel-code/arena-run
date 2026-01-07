const API_BASE = '/.netlify/functions'

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token')
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || 'Request failed')
  }

  return response.json()
}

export const api = {
  // Auth
  getAuthUrl: () => fetchAPI<{ url: string }>('/auth'),
  getUser: () => fetchAPI<{ user: import('../types').User }>('/auth-user'),
  logout: () => {
    localStorage.removeItem('auth_token')
    window.location.href = '/'
  },

  // Videos
  getVideos: () => fetchAPI<{ videos: import('../types').Video[] }>('/videos'),
  getVideo: (id: string) => fetchAPI<{ video: import('../types').Video }>(`/videos?id=${id}`),
  createVideo: (data: { 
    title: string; 
    description?: string;
    season?: string;
    day?: string;
    wins_attacks?: string;
    arena_time?: string;
    shield_hits?: string;
    overtime_type?: string;
    start_rank?: string;
    end_rank?: string;
    has_commentary?: boolean;
    fileSize?: number;
  }) =>
    fetchAPI<{ video: import('../types').Video; uploadUrl: string }>('/videos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  publishVideo: (id: string, is_published: boolean) =>
    fetchAPI<{ video: import('../types').Video }>(`/videos`, {
      method: 'PATCH',
      body: JSON.stringify({ id, is_published }),
    }),
  updateVideo: (id: string, data: {
    title?: string;
    description?: string;
    season?: string;
    day?: string;
    wins_attacks?: string;
    arena_time?: string;
    shield_hits?: string;
    overtime_type?: string;
    start_rank?: string;
    end_rank?: string;
    has_commentary?: boolean;
  }) =>
    fetchAPI<{ video: import('../types').Video }>(`/videos`, {
      method: 'PATCH',
      body: JSON.stringify({ id, ...data }),
    }),
  deleteVideo: (id: string) =>
    fetchAPI<{ success: boolean }>(`/videos?id=${id}`, { method: 'DELETE' }),
  updateVideoDurations: () =>
    fetchAPI<{ message: string; total: number; updated: number; failed: number }>('/update-video-durations', {
      method: 'POST',
    }),
  updateSingleVideoDuration: (videoId: string) =>
    fetchAPI<{ success: boolean; duration?: number }>('/update-single-video-duration', {
      method: 'POST',
      body: JSON.stringify({ videoId }),
    }),

  uploadComplete: (videoId: string) =>
    fetchAPI<{ success: boolean }>('/upload-complete', {
      method: 'POST',
      body: JSON.stringify({ videoId }),
    }),

  // Playback
  getPlaybackToken: (videoId: string) =>
    fetchAPI<{ token: string }>(`/playback?videoId=${videoId}`),

  // Tracking
  updateWatchTime: (params: { sessionId: string | null; watchSeconds: number; videoId?: string; watermarkCode?: string }) =>
    fetchAPI<{ success: boolean; sessionId?: string }>('/tracking', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  endSession: (sessionId: string) =>
    fetchAPI<{ success: boolean }>('/tracking', {
      method: 'POST',
      body: JSON.stringify({ sessionId, action: 'end' }),
    }),

  // Admin
  getMembers: () => fetchAPI<{ members: import('../types').Member[] }>('/admin-members-test'),
  uploadMembers: (members: { discord_id: string; game_id: string }[]) =>
    fetchAPI<{ success: boolean; count: number }>('/admin-members-test', {
      method: 'POST',
      body: JSON.stringify({ members }),
    }),
  addMember: (member: { discord_id: string; game_id: string; discord_username?: string }) =>
    fetchAPI<{ success: boolean; member: import('../types').Member }>('/admin-members-test', {
      method: 'POST',
      body: JSON.stringify(member),
    }),
  toggleMember: (discordId: string, isActive: boolean) =>
    fetchAPI<{ success: boolean }>('/admin-members-test', {
      method: 'PATCH',
      body: JSON.stringify({ discord_id: discordId, is_active: isActive }),
    }),
  updateMemberRole: (discordId: string, role: 'super_admin' | 'admin' | 'editor' | 'member') =>
    fetchAPI<{ success: boolean }>('/admin-members-test', {
      method: 'PATCH',
      body: JSON.stringify({ discord_id: discordId, role }),
    }),
  getMemberProfile: (discordId: string) =>
    fetchAPI<{ profile: import('../types').Member & { 
      sessions: import('../types').ViewSession[]; 
      total_watch_time: number; 
      videos_watched: number; 
    } }>(`/admin-members-test?discord_id=${discordId}`),

  // Sessions
  getSessions: () => fetchAPI<{ 
    sessions: (import('../types').ViewSession & { 
      videos?: { title: string }
      member_name?: string
      member_avatar?: string
    })[] 
  }>('/admin-sessions'),

  // Stats
  getStats: (startDate?: string, endDate?: string) => {
    let url = '/admin-stats'
    const params = new URLSearchParams()
    if (startDate) params.append('start', startDate)
    if (endDate) params.append('end', endDate)
    if (params.toString()) url += '?' + params.toString()
    return fetchAPI<{
      totalViews: number
      totalLikes: number
      totalMembers: number
      activeMembers: number
      totalVideos: number
      publishedVideos: number
      todayViews: number
      weekViews: number
      totalWatchTime: number
      topVideos: { id: string; title: string; views: number; likes: number }[]
      newMembersThisMonth: number
      recentSessions: import('../types').ViewSession[]
      periodViews: number
      periodWatchTime: number
      periodSessions: number
    }>(url)
  },

  // Settings
  getPublicSettings: () => fetchAPI<{ settings: {
    site_name: string
    site_description: string
  } }>('/admin-settings?public=true'),
  
  getSettings: () => fetchAPI<{ settings: {
    site_name: string
    site_description: string
    require_role: boolean
    allow_new_members: boolean
    max_sessions_per_user: number
    session_timeout: number
    // Notification settings
    notify_country_change: boolean
    notify_ip_change: boolean
    notify_unauthorized_login: boolean
    notify_excessive_views: boolean
    excessive_views_threshold: number
    excessive_views_interval: number
    notify_suspicious_activity: boolean
    notify_vpn_proxy: boolean
    notify_multiple_devices: boolean
    notify_odd_hours: boolean
    odd_hours_start: number
    odd_hours_end: number
    notify_new_upload: boolean
    notify_new_publish: boolean
    notify_new_session: boolean
    webhook_url: string
  } }>('/admin-settings'),

  saveSettings: (settings: {
    siteName: string
    siteDescription: string
    discordGuildIds?: string
    requireRole: boolean
    allowNewMembers: boolean
    maxSessionsPerUser: number
    sessionTimeout: number
    // Notification settings
    notifyCountryChange: boolean
    notifyIpChange: boolean
    notifyUnauthorizedLogin: boolean
    notifyExcessiveViews: boolean
    excessiveViewsThreshold: number
    excessiveViewsInterval: number
    notifySuspiciousActivity: boolean
    notifyVpnProxy: boolean
    notifyMultipleDevices: boolean
    notifyOddHours: boolean
    oddHoursStart: number
    oddHoursEnd: number
    notifyNewUpload: boolean
    notifyNewPublish: boolean
    notifyNewSession: boolean
    allowedRoles: string
    webhookUrl: string
  }) => fetchAPI<{ settings: any; message: string }>('/admin-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  }),

  testNotifications: () => fetchAPI<{ ok: boolean; diagnostics: any }>('/test-notifications', {
    method: 'POST',
  }),

}
