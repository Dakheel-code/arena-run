import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify admin authentication
    const authHeader = event.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token' })
      }
    }

    // Check if user is admin
    const { data: member } = await supabase
      .from('members')
      .select('role')
      .eq('discord_id', user.id)
      .single()

    if (!member || !['admin', 'super_admin'].includes(member.role)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    // Check if schema should be included
    const body = event.body ? JSON.parse(event.body) : {}
    const includeSchema = body.includeSchema || false

    // Get all tables data
    const backup: any = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      includeSchema,
      data: {},
      schema: includeSchema ? {} : undefined
    }

    // Backup members table
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')
    
    if (membersError) throw membersError
    backup.data.members = members

    // Backup videos table
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('*')
    
    if (videosError) throw videosError
    backup.data.videos = videos

    // Backup login_logs table
    const { data: loginLogs, error: logsError } = await supabase
      .from('login_logs')
      .select('*')
    
    if (logsError) throw logsError
    backup.data.login_logs = loginLogs

    // Backup watch_sessions table
    const { data: sessions, error: sessionsError } = await supabase
      .from('watch_sessions')
      .select('*')
    
    if (sessionsError) throw sessionsError
    backup.data.watch_sessions = sessions

    // Backup settings table
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('*')
    
    if (settingsError) throw settingsError
    backup.data.settings = settings

    // Backup likes table (if exists)
    const { data: likes } = await supabase
      .from('likes')
      .select('*')
    
    if (likes) backup.data.likes = likes

    // Backup comments table (if exists)
    const { data: comments } = await supabase
      .from('comments')
      .select('*')
    
    if (comments) backup.data.comments = comments

    // Calculate backup statistics
    const stats = {
      totalMembers: members?.length || 0,
      totalVideos: videos?.length || 0,
      totalLoginLogs: loginLogs?.length || 0,
      totalSessions: sessions?.length || 0,
      totalLikes: likes?.length || 0,
      totalComments: comments?.length || 0,
    }

    backup.stats = stats

    // Get schema information if requested
    if (includeSchema) {
      try {
        // Fallback: Get basic schema info for each table
        const tableNames = ['members', 'videos', 'login_logs', 'watch_sessions', 'settings', 'likes', 'comments']
        
        for (const tableName of tableNames) {
          try {
            const { data: sampleRow } = await supabase
              .from(tableName)
              .select('*')
              .limit(1)
            
            if (sampleRow && sampleRow.length > 0) {
              const columns = Object.keys(sampleRow[0])
              backup.schema[tableName] = {
                columns: columns,
                note: 'Column names only. Use pg_dump for complete structure with types and constraints.'
              }
            }
          } catch (err) {
            backup.schema[tableName] = {
              error: 'Could not retrieve schema'
            }
          }
        }

        // Add SQL dump instructions
        backup.schema.instructions = {
          title: 'Complete Schema Backup',
          description: 'For complete schema backup including constraints, indexes, and relationships, use pg_dump:',
          command: `pg_dump -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres --schema-only > schema.sql`,
          note: 'Replace YOUR_PROJECT_REF with your Supabase project reference from Settings → Database'
        }
      } catch (schemaError) {
        console.error('Schema extraction error:', schemaError)
        backup.schema.error = 'Could not extract full schema. Use pg_dump for complete schema backup.'
      }
    }

    const filename = includeSchema 
      ? `arena-run-full-backup-${new Date().toISOString().split('T')[0]}.json`
      : `arena-run-backup-${new Date().toISOString().split('T')[0]}.json`

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      },
      body: JSON.stringify(backup, null, 2)
    }
  } catch (error: any) {
    console.error('Backup error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to create backup',
        details: error.message 
      })
    }
  }
}
