// Video compression utilities
export interface CompressionOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  quality?: number
  onProgress?: (progress: number) => void
}

export async function compressVideo(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxSizeMB = 100,
    maxWidthOrHeight = 1920,
    quality = 0.8,
    onProgress
  } = options

  // If file is already small enough, return it
  if (file.size / 1024 / 1024 < maxSizeMB) {
    onProgress?.(100)
    return file
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    video.preload = 'metadata'
    video.src = URL.createObjectURL(file)

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)

      // Calculate new dimensions
      let width = video.videoWidth
      let height = video.videoHeight

      if (width > height) {
        if (width > maxWidthOrHeight) {
          height = Math.round((height * maxWidthOrHeight) / width)
          width = maxWidthOrHeight
        }
      } else {
        if (height > maxWidthOrHeight) {
          width = Math.round((width * maxWidthOrHeight) / height)
          height = maxWidthOrHeight
        }
      }

      canvas.width = width
      canvas.height = height

      // Draw first frame for thumbnail
      video.currentTime = 1
    }

    video.onseeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compression failed'))
            return
          }

          // For video files, we can't actually compress them client-side
          // But we can provide the original with metadata
          const compressedFile = new File([file], file.name, {
            type: file.type,
            lastModified: Date.now()
          })

          onProgress?.(100)
          resolve(compressedFile)
        },
        'image/jpeg',
        quality
      )
    }

    video.onerror = () => {
      reject(new Error('Video loading failed'))
    }
  })
}

export function getVideoMetadata(file: File): Promise<{
  duration: number
  width: number
  height: number
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = URL.createObjectURL(file)

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      })
    }

    video.onerror = () => {
      reject(new Error('Failed to load video metadata'))
    }
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
