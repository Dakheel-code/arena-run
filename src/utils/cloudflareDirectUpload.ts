// Cloudflare Stream Direct Upload utilities
export interface DirectUploadOptions {
  onProgress?: (progress: number) => void
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void
}

export interface DirectUploadResult {
  uid: string
  uploadUrl: string
}

const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks

export async function getDirectUploadUrl(
  accountId: string,
  apiToken: string
): Promise<DirectUploadResult> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maxDurationSeconds: 21600, // 6 hours max
        requireSignedURLs: false
      })
    }
  )

  if (!response.ok) {
    throw new Error('Failed to get direct upload URL')
  }

  const data = await response.json()
  return {
    uid: data.result.uid,
    uploadUrl: data.result.uploadURL
  }
}

export async function uploadFileInChunks(
  file: File,
  uploadUrl: string,
  options: DirectUploadOptions = {}
): Promise<void> {
  const { onProgress, onChunkComplete } = options
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  let uploadedChunks = 0

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const chunk = file.slice(start, end)

    const formData = new FormData()
    formData.append('file', chunk)

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Failed to upload chunk ${i + 1}/${totalChunks}`)
    }

    uploadedChunks++
    const progress = (uploadedChunks / totalChunks) * 100
    onProgress?.(progress)
    onChunkComplete?.(i, totalChunks)
  }
}

export async function uploadFileDirect(
  file: File,
  accountId: string,
  apiToken: string,
  options: DirectUploadOptions = {}
): Promise<string> {
  // Get direct upload URL
  const { uid, uploadUrl } = await getDirectUploadUrl(accountId, apiToken)

  // Upload file
  const formData = new FormData()
  formData.append('file', file)

  const xhr = new XMLHttpRequest()

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100
        options.onProgress?.(progress)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(uid)
      } else {
        reject(new Error('Upload failed'))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'))
    })

    xhr.open('POST', uploadUrl)
    xhr.send(formData)
  })
}
