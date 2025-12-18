import { useState, useEffect } from 'react'
import { api, Comment } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { MessageCircle, Send, Reply, Edit2, Trash2, User, Loader } from 'lucide-react'

interface CommentsProps {
  videoId: string
}

export function Comments({ videoId }: CommentsProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  // Get user avatar from existing comments or user object
  const getUserAvatar = () => {
    // First try user.avatar
    if (user?.avatar && user.avatar.startsWith('http')) {
      return user.avatar
    }
    // Then try to find from existing comments
    const userComment = comments.find(c => c.discord_id === user?.discord_id)
    if (userComment?.author_avatar) {
      return userComment.author_avatar
    }
    // Check replies too
    for (const comment of comments) {
      const reply = comment.replies?.find(r => r.discord_id === user?.discord_id)
      if (reply?.author_avatar) {
        return reply.author_avatar
      }
    }
    return null
  }

  const userAvatar = getUserAvatar()

  useEffect(() => {
    loadComments()
  }, [videoId])

  const loadComments = async () => {
    try {
      setIsLoading(true)
      const data = await api.getComments(videoId)
      setComments(data)
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !user) return

    try {
      setIsSubmitting(true)
      const comment = await api.addComment(videoId, newComment)
      setComments([...comments, comment])
      setNewComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
      alert('Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || !user) return

    try {
      setIsSubmitting(true)
      const reply = await api.addComment(videoId, replyContent, parentId)
      
      // Add reply to the parent comment
      setComments(comments.map(c => 
        c.id === parentId 
          ? { ...c, replies: [...(c.replies || []), reply] }
          : c
      ))
      setReplyingTo(null)
      setReplyContent('')
    } catch (error) {
      console.error('Failed to add reply:', error)
      alert('Failed to add reply')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditComment = async (commentId: string, isReply: boolean, parentId?: string) => {
    if (!editContent.trim()) return

    try {
      await api.editComment(commentId, editContent)
      
      if (isReply && parentId) {
        setComments(comments.map(c => 
          c.id === parentId 
            ? { 
                ...c, 
                replies: c.replies?.map(r => 
                  r.id === commentId 
                    ? { ...r, content: editContent, is_edited: true }
                    : r
                )
              }
            : c
        ))
      } else {
        setComments(comments.map(c => 
          c.id === commentId 
            ? { ...c, content: editContent, is_edited: true }
            : c
        ))
      }
      
      setEditingId(null)
      setEditContent('')
    } catch (error) {
      console.error('Failed to edit comment:', error)
      alert('Failed to edit comment')
    }
  }

  const handleDeleteComment = async (commentId: string, isReply: boolean, parentId?: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await api.deleteComment(commentId)
      
      if (isReply && parentId) {
        setComments(comments.map(c => 
          c.id === parentId 
            ? { ...c, replies: c.replies?.filter(r => r.id !== commentId) }
            : c
        ))
      } else {
        setComments(comments.filter(c => c.id !== commentId))
      }
    } catch (error) {
      console.error('Failed to delete comment:', error)
      alert('Failed to delete comment')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const CommentItem = ({ 
    comment, 
    isReply = false, 
    parentId 
  }: { 
    comment: Comment
    isReply?: boolean
    parentId?: string 
  }) => {
    const canEdit = user?.discord_id === comment.discord_id
    const canDelete = user?.discord_id === comment.discord_id || user?.is_admin

    return (
      <div className={`${isReply ? 'ml-8 mt-3' : 'mt-4'}`}>
        <div className="flex gap-3">
          {/* Avatar */}
          {comment.author_avatar ? (
            <img 
              src={comment.author_avatar} 
              alt={comment.author_name}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-theme/20 flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-theme-light" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{comment.author_name}</span>
              <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
              {comment.is_edited && (
                <span className="text-xs text-gray-500">(edited)</span>
              )}
            </div>

            {/* Content */}
            {editingId === comment.id ? (
              <div className="mt-2">
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  autoFocus
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-theme-light focus:outline-none text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleEditComment(comment.id, isReply, parentId)
                    } else if (e.key === 'Escape') {
                      setEditingId(null)
                      setEditContent('')
                    }
                  }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleEditComment(comment.id, isReply, parentId)}
                    className="px-3 py-1 bg-theme text-white text-sm rounded-lg hover:opacity-80"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setEditContent('') }}
                    className="px-3 py-1 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-300 mt-1 break-words">{comment.content}</p>
            )}

            {/* Actions */}
            {user && editingId !== comment.id && (
              <div className="flex items-center gap-3 mt-2">
                {!isReply && (
                  <button
                    onClick={() => {
                      setReplyingTo(replyingTo === comment.id ? null : comment.id)
                      setReplyContent('')
                    }}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-theme-light transition-colors"
                  >
                    <Reply size={12} />
                    Reply
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={() => {
                      setEditingId(comment.id)
                      setEditContent(comment.content)
                    }}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDeleteComment(comment.id, isReply, parentId)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                )}
              </div>
            )}

            {/* Reply Form */}
            {replyingTo === comment.id && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-theme-light focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmitReply(comment.id)
                    }
                  }}
                />
                <button
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={isSubmitting || !replyContent.trim()}
                  className="px-3 py-2 bg-theme text-white rounded-lg hover:opacity-80 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader className="animate-spin" size={16} /> : <Send size={16} />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Replies */}
        {!isReply && comment.replies && comment.replies.length > 0 && (
          <div className="border-l-2 border-gray-700 pl-2">
            {comment.replies.map(reply => (
              <CommentItem 
                key={reply.id} 
                comment={reply} 
                isReply={true} 
                parentId={comment.id} 
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div dir="ltr">
      <h3 className="text-xl font-bold flex items-center gap-3 mb-6">
        <MessageCircle className="text-theme-light" size={24} />
        <span>{comments.length} Comments</span>
      </h3>

      {/* Add Comment Form */}
      {user ? (
        <form onSubmit={handleSubmitComment} className="mb-8" dir="ltr">
          <div className="flex gap-4 items-start">
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt={user.username}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-theme/20 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-theme-light" />
              </div>
            )}
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                dir="auto"
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 focus:border-theme-light focus:outline-none resize-none transition-colors text-white"
              />
              <div className="flex justify-start mt-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="px-6 py-2.5 bg-theme text-white rounded-full hover:opacity-90 disabled:opacity-50 flex items-center gap-2 font-medium transition-all"
                >
                  {isSubmitting ? (
                    <Loader className="animate-spin" size={18} />
                  ) : (
                    <>
                      <Send size={18} />
                      Comment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-gray-800/30 rounded-xl p-6 text-center mb-8">
          <p className="text-gray-400">Sign in to add a comment</p>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="animate-spin text-theme-light" size={32} />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  )
}
