import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar?: string
  email?: string
}

export const handler: Handler = async (event) => {
  try {
    const { discordUser, game_id } = JSON.parse(event.body || '{}')

    if (!discordUser || !discordUser.id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Discord user data is required' })
      }
    }

    // Check if member already exists
    const { data: existingMember } = await supabase
      .from('members')
      .select('discord_id, discord_username, game_id')
      .eq('discord_id', discordUser.id)
      .single()

    if (existingMember) {
      // Update existing member data
      const avatarUrl = discordUser.avatar 
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null

      const { data: updatedMember } = await supabase
        .from('members')
        .update({
          discord_username: discordUser.username,
          discord_avatar: avatarUrl,
          last_login: new Date().toISOString(),
          login_count: (existingMember as any).login_count + 1 || 1
        })
        .eq('discord_id', discordUser.id)
        .select()
        .single()

      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          member: updatedMember,
          isNew: false 
        })
      }
    }

    // Create new member
    const avatarUrl = discordUser.avatar 
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null

    const { data: newMember } = await supabase
      .from('members')
      .insert({
        discord_id: discordUser.id,
        discord_username: discordUser.username,
        discord_avatar: avatarUrl,
        game_id: game_id || `${discordUser.username.toLowerCase().replace(/\s+/g, '_')}`,
        is_active: true,
        role: 'member',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        login_count: 1
      })
      .select()
      .single()

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        member: newMember,
        isNew: true 
      })
    }

  } catch (error) {
    console.error('Error in auth-register:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
