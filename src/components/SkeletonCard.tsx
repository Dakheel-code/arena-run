export function SkeletonCard() {
  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl overflow-hidden border border-gray-700/50 animate-pulse">
      {/* Thumbnail Skeleton */}
      <div className="relative aspect-video bg-gray-700" />
      
      {/* Content Skeleton */}
      <div className="p-4">
        {/* Title */}
        <div className="h-4 bg-gray-700 rounded mb-2 w-3/4" />
        <div className="h-4 bg-gray-700 rounded mb-3 w-1/2" />
        
        {/* Description */}
        <div className="h-3 bg-gray-700 rounded mb-2 w-full" />
        <div className="h-3 bg-gray-700 rounded mb-4 w-2/3" />
        
        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="h-3 bg-gray-700 rounded w-16" />
          <div className="h-3 bg-gray-700 rounded w-16" />
        </div>
      </div>
    </div>
  )
}
