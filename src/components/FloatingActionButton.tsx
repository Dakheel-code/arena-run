import { useState } from 'react'
import { ThumbsUp, Heart, Share2, Flag } from 'lucide-react'

interface FloatingActionButtonProps {
  onLike?: () => void
  onFavorite?: () => void
  onShare?: () => void
  onReport?: () => void
  isLiked?: boolean
  isFavorited?: boolean
}

export function FloatingActionButton({
  onLike,
  onFavorite,
  onShare,
  onReport,
  isLiked = false,
  isFavorited = false
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-20 right-4 z-40 md:hidden">
      {/* Action Buttons */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-2 mb-2">
          {onLike && (
            <button
              onClick={() => {
                onLike()
                setIsOpen(false)
              }}
              className={`p-3 rounded-full shadow-lg transition-all active:scale-95 ${
                isLiked ? 'bg-theme text-white' : 'bg-white text-gray-700'
              }`}
            >
              <ThumbsUp size={20} className={isLiked ? 'fill-current' : ''} />
            </button>
          )}
          
          {onFavorite && (
            <button
              onClick={() => {
                onFavorite()
                setIsOpen(false)
              }}
              className={`p-3 rounded-full shadow-lg transition-all active:scale-95 ${
                isFavorited ? 'bg-red-500 text-white' : 'bg-white text-gray-700'
              }`}
            >
              <Heart size={20} className={isFavorited ? 'fill-current' : ''} />
            </button>
          )}
          
          {onShare && (
            <button
              onClick={() => {
                onShare()
                setIsOpen(false)
              }}
              className="p-3 bg-white text-gray-700 rounded-full shadow-lg transition-all active:scale-95"
            >
              <Share2 size={20} />
            </button>
          )}
          
          {onReport && (
            <button
              onClick={() => {
                onReport()
                setIsOpen(false)
              }}
              className="p-3 bg-white text-gray-700 rounded-full shadow-lg transition-all active:scale-95"
            >
              <Flag size={20} />
            </button>
          )}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 bg-theme text-white rounded-full shadow-xl transition-all active:scale-95 ${
          isOpen ? 'rotate-45' : ''
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}
