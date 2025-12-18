import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JWT_SECRET = process.env.JWT_SECRET!

interface JWTPayload {
  discordId: string
  username: string
  isAdmin: boolean
}

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

function getUser(event: any): JWTPayload | null {
  const authHeader = event.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.substring(7)
  const result = verifyToken(token)
  if (!result.valid || !result.payload) return null
  // JWT uses discord_id not discordId
  return {
    discordId: result.payload.discord_id,
    username: result.payload.username,
    isAdmin: result.payload.is_admin,
  }
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  const user = getUser(event)
  
  // GET - Fetch comments for a video
  if (event.httpMethod === 'GET') {
    const videoId = event.queryStringParameters?.videoId
    
    if (!videoId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Video ID is required' }),
      }
    }

    try {
      // Fetch all comments for the video
      const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Get unique discord IDs to fetch member info
      const discordIds = [...new Set(comments?.map(c => c.discord_id) || [])]
      
      // Fetch member info
      const { data: members } = await supabase
        .from('members')
        .select('discord_id, discord_username, discord_avatar')
        .in('discord_id', discordIds)

      // Create a map for quick lookup
      const memberMap = new Map(members?.map(m => [m.discord_id, m]) || [])

      // Enrich comments with member info
      const enrichedComments = comments?.map(comment => ({
        ...comment,
        author_name: memberMap.get(comment.discord_id)?.discord_username || 'Unknown',
        author_avatar: memberMap.get(comment.discord_id)?.discord_avatar || null,
      })) || []

      // Organize into tree structure (parent comments with replies)
      const parentComments = enrichedComments.filter(c => !c.parent_id)
      const replies = enrichedComments.filter(c => c.parent_id)

      const commentsWithReplies = parentComments.map(parent => ({
        ...parent,
        replies: replies.filter(r => r.parent_id === parent.id),
      }))

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(commentsWithReplies),
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch comments' }),
      }
    }
  }

  // POST - Add a new comment or reply
  if (event.httpMethod === 'POST') {
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }

    try {
      const { videoId, content, parentId } = JSON.parse(event.body || '{}')

      if (!videoId || !content?.trim()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Video ID and content are required' }),
        }
      }

      // Insert comment
      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          video_id: videoId,
          discord_id: user.discordId,
          parent_id: parentId || null,
          content: content.trim(),
        })
        .select()
        .single()

      if (error) throw error

      // Fetch member info for the response
      const { data: member } = await supabase
        .from('members')
        .select('discord_username, discord_avatar')
        .eq('discord_id', user.discordId)
        .single()

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          ...comment,
          author_name: member?.discord_username || user.username,
          author_avatar: member?.discord_avatar || null,
          replies: [],
        }),
      }
    } catch (error) {
      console.error('Error creating comment:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create comment' }),
      }
    }
  }

  // PUT - Edit a comment
  if (event.httpMethod === 'PUT') {
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }

    try {
      const { commentId, content } = JSON.parse(event.body || '{}')

      if (!commentId || !content?.trim()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Comment ID and content are required' }),
        }
      }

      // Check if user owns the comment or is admin
      const { data: existingComment } = await supabase
        .from('comments')
        .select('discord_id')
        .eq('id', commentId)
        .single()

      if (!existingComment) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Comment not found' }),
        }
      }

      if (existingComment.discord_id !== user.discordId && !user.isAdmin) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Not authorized to edit this comment' }),
        }
      }

      // Update comment
      const { data: comment, error } = await supabase
        .from('comments')
        .update({
          content: content.trim(),
          is_edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .select()
        .single()

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(comment),
      }
    } catch (error) {
      console.error('Error updating comment:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update comment' }),
      }
    }
  }

  // DELETE - Delete a comment
  if (event.httpMethod === 'DELETE') {
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }

    const commentId = event.queryStringParameters?.commentId

    if (!commentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Comment ID is required' }),
      }
    }

    try {
      // Check if user owns the comment or is admin
      const { data: existingComment } = await supabase
        .from('comments')
        .select('discord_id')
        .eq('id', commentId)
        .single()

      if (!existingComment) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Comment not found' }),
        }
      }

      if (existingComment.discord_id !== user.discordId && !user.isAdmin) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Not authorized to delete this comment' }),
        }
      }

      // Delete comment (cascade will delete replies)
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to delete comment' }),
      }
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' }),
  }
}
