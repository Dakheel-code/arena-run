export type UserRole = 'super_admin' | 'admin' | 'editor' | 'member';

export interface User {
  id: string;
  discord_id: string;
  username: string;
  avatar: string;
  game_id?: string;
  is_admin: boolean;
  role?: UserRole;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  stream_uid: string;
  thumbnail_url?: string;
  duration?: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // Metadata fields
  season?: string;
  day?: string;
  wins_attacks?: string;
  arena_time?: string;
  shield_hits?: string;
  overtime_type?: string;
  start_rank?: string;
  end_rank?: string;
  has_commentary?: boolean;
  // Uploader info
  uploaded_by?: string;
  uploader_name?: string;
  uploader_avatar?: string;
  // Stats
  views_count?: number;
  likes_count?: number;
  user_liked?: boolean;
}

export interface ViewSession {
  id: string;
  video_id: string;
  discord_id: string;
  watermark_code: string;
  ip_address?: string;
  country?: string;
  city?: string;
  is_vpn?: boolean;
  isp?: string;
  user_agent?: string;
  started_at: string;
  ended_at?: string;
  watch_seconds: number;
}

export interface Member {
  id: string;
  discord_id: string;
  discord_username?: string;
  discord_avatar?: string;
  game_id: string;
  is_active: boolean;
  role?: UserRole;
  role_assigned_by_name?: string;
  role_assigned_at?: string;
  created_at: string;
  last_login?: string;
  login_count?: number;
}

export interface Alert {
  id: string;
  type: 'country_change' | 'excessive_views' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high';
  discord_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
