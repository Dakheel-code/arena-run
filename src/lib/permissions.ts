import { User, UserRole } from '../types'

export const PERMISSIONS = {
  // Video permissions
  VIEW_UNPUBLISHED_VIDEOS: ['super_admin', 'admin', 'editor'],
  UPLOAD_VIDEOS: ['super_admin', 'admin', 'editor'],
  EDIT_OWN_VIDEOS: ['super_admin', 'admin', 'editor'],
  EDIT_ALL_VIDEOS: ['super_admin', 'admin', 'editor'],
  DELETE_VIDEOS: ['super_admin', 'admin'],
  PUBLISH_VIDEOS: ['super_admin', 'admin', 'editor'],
  
  
  // Admin panel permissions
  ACCESS_ADMIN_PANEL: ['super_admin', 'admin', 'editor'],
  VIEW_MEMBERS: ['super_admin', 'admin'],
  MANAGE_MEMBERS: ['super_admin', 'admin'],
  ASSIGN_ROLES: ['super_admin', 'admin'],
  ASSIGN_SUPER_ADMIN: ['super_admin'],
  DELETE_ACCOUNTS: ['super_admin'],
  
  // Stats and logs
  VIEW_ALL_STATS: ['super_admin', 'admin'],
  VIEW_CONTENT_STATS: ['super_admin', 'admin', 'editor'],
  VIEW_LOGIN_LOGS: ['super_admin', 'admin'],
  VIEW_SESSIONS: ['super_admin', 'admin'],
  
  // Settings
  MANAGE_SETTINGS: ['super_admin', 'admin'],
} as const

export function hasPermission(
  user: User | null,
  permission: keyof typeof PERMISSIONS
): boolean {
  if (!user || !user.role) return false
  const allowedRoles = PERMISSIONS[permission] as readonly UserRole[]
  return (allowedRoles as readonly string[]).includes(user.role)
}

export function isAdmin(user: User | null): boolean {
  if (!user || !user.role) return false
  return user.role === 'super_admin' || user.role === 'admin'
}

export function isSuperAdmin(user: User | null): boolean {
  if (!user || !user.role) return false
  return user.role === 'super_admin'
}

export function isEditor(user: User | null): boolean {
  if (!user || !user.role) return false
  return user.role === 'super_admin' || user.role === 'admin' || user.role === 'editor'
}

export function canEditVideo(user: User | null, videoOwnerId: string): boolean {
  if (!user) return false
  
  // Owner can always edit their own video if they're editor or above
  if (user.discord_id === videoOwnerId && hasPermission(user, 'EDIT_OWN_VIDEOS')) {
    return true
  }
  
  // Admins and editors can edit all videos
  return hasPermission(user, 'EDIT_ALL_VIDEOS')
}

export function canDeleteVideo(user: User | null): boolean {
  return hasPermission(user, 'DELETE_VIDEOS')
}


export function getMaxRoleUserCanAssign(user: User | null): UserRole | null {
  if (!user || !user.role) return null
  
  if (user.role === 'super_admin') return 'super_admin'
  if (user.role === 'admin') return 'admin'
  
  return null
}
