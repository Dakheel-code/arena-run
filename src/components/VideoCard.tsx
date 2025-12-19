import { Link } from 'react-router-dom'
import { Play, Clock, ThumbsUp, User } from 'lucide-react'
import { Video } from '../types'

const triggerHapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10)
  }
}

interface VideoCardProps {
  video: Video
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatNumber(num?: number): string {
  if (!num) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

function getThumbnailUrl(streamUid: string): string {
  return `https://customer-f13bd0opbb08xh8b.cloudflarestream.com/${streamUid}/thumbnails/thumbnail.jpg?time=10s&width=640`
}

export function VideoCard({ video }: VideoCardProps) {
  const thumbnailUrl = video.thumbnail_url || (video.stream_uid ? getThumbnailUrl(video.stream_uid) : null)
  
  return (
    <Link
      to={`/watch/${video.id}`}
      onClick={triggerHapticFeedback}
      className="group block bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl overflow-hidden border border-gray-700/50 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 active:scale-95"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-discord-darker overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={video.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
            <Play size={48} className="text-gray-500" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-theme/90 backdrop-blur-sm flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play size={28} className="text-white ml-1" fill="white" />
          </div>
        </div>

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
            <Clock size={12} />
            {formatDuration(video.duration)}
          </div>
        )}

        {/* Season & Day badge */}
        {(video.season || video.day) && (
          <div className="absolute top-2 left-2 bg-theme/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold">
            {video.season && `S${video.season}`}{video.season && video.day && ' • '}{video.day && `D${video.day}`}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5 sm:p-3">
        {/* Title */}
        <h3 className="font-semibold text-xs sm:text-sm mb-2 group-hover:text-theme-light transition-colors line-clamp-2 leading-tight">
          {video.title}
        </h3>

        {/* Uploader */}
        {video.uploader_name && (
          <div 
            className="flex items-center gap-1.5 sm:gap-2 mb-2"
            onClick={(e) => {
              if (video.uploaded_by) {
                e.preventDefault()
                e.stopPropagation()
                triggerHapticFeedback()
                window.location.href = `/admin/members/${video.uploaded_by}`
              }
            }}
          >
            {video.uploader_avatar ? (
              <img 
                src={video.uploader_avatar.startsWith('http') 
                  ? video.uploader_avatar 
                  : `https://cdn.discordapp.com/avatars/${video.uploaded_by}/${video.uploader_avatar}.png`
                }
                alt={video.uploader_name}
                loading="lazy"
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover hover:ring-2 hover:ring-theme-light transition-all cursor-pointer"
              />
            ) : (
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-theme/20 flex items-center justify-center hover:ring-2 hover:ring-theme-light transition-all cursor-pointer">
                <User size={10} className="text-theme-light" />
              </div>
            )}
            <span className="text-[10px] sm:text-xs text-gray-400 hover:text-theme-light transition-colors cursor-pointer truncate">{video.uploader_name}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 pt-1.5 sm:pt-2 border-t border-gray-700/50">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-0.5 sm:gap-1">
              <ThumbsUp size={12} className="text-gray-400" />
              <span className="text-[10px] sm:text-xs">{formatNumber(video.likes_count)}</span>
            </span>
          </div>
          <span className="text-gray-500 text-[10px] sm:text-xs">
            {new Date(video.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>
    </Link>
  )
}
