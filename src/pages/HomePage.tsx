import { useEffect, useState } from 'react'
import { Video } from '../types'
import { api } from '../lib/api'
import { VideoCard } from '../components/VideoCard'
import { Layout } from '../components/Layout'
import { Film, Loader } from 'lucide-react'

export function HomePage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const { videos } = await api.getVideos()
        setVideos(videos.filter((v) => v.is_published))
      } catch (error) {
        console.error('Failed to fetch videos:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchVideos()
  }, [])

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Arena Run</h1>
        <p className="text-gray-400">Watch the latest exclusive videos</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="animate-spin text-theme-light" size={48} />
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20">
          <Film size={64} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">No videos available at the moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </Layout>
  )
}
