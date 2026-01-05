import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { schedule } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!
const CF_STREAM_API_TOKEN = process.env.CF_STREAM_API_TOKEN!

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getVideoInfoFromCloudflare(streamUid: string) {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${streamUid}`,
      {
        headers: {
          Authorization: `Bearer ${CF_STREAM_API_TOKEN}`,
        },
      }
    )

    if (!response.ok) {
      console.error(`Failed to fetch video ${streamUid}:`, response.status)
      return null
    }

    const data = await response.json()
    return data.result
  } catch (error) {
    console.error(`Error fetching video ${streamUid}:`, error)
    return null
  }
}

const myHandler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('🕐 Running scheduled duration update...')
  
  try {
    // Get all videos with missing or invalid duration (null, 0, or negative)
    const { data: videos, error } = await supabase
      .from('videos')
      .select('id, stream_uid, title')
      .or('duration.is.null,duration.eq.0,duration.lt.0')
      .limit(20) // Process 20 videos at a time to avoid timeout

    if (error) {
      console.error('Error fetching videos:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      }
    }

    if (!videos || videos.length === 0) {
      console.log('✅ No videos need duration update')
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No videos need update', updated: 0 })
      }
    }

    console.log(`📹 Found ${videos.length} videos to update`)

    let updated = 0
    let failed = 0

    for (const video of videos) {
      console.log(`Processing: ${video.title}`)
      
      const videoInfo = await getVideoInfoFromCloudflare(video.stream_uid)
      
      if (videoInfo && videoInfo.duration) {
        const duration = Math.round(videoInfo.duration)
        
        const { error: updateError } = await supabase
          .from('videos')
          .update({ duration })
          .eq('id', video.id)

        if (updateError) {
          console.error(`❌ Failed to update ${video.title}:`, updateError)
          failed++
        } else {
          console.log(`✅ Updated ${video.title}: ${duration}s`)
          updated++
        }
      } else {
        console.log(`⏳ Duration not ready for ${video.title}`)
        failed++
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`🎬 Update complete: ${updated} updated, ${failed} failed`)

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Duration update completed',
        total: videos.length,
        updated,
        failed
      })
    }
  } catch (error: any) {
    console.error('❌ Error in scheduled update:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}

// Run every hour
export const handler = schedule('0 * * * *', myHandler)
