import type { Handler } from '@netlify/functions'

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI!

export const handler: Handler = async () => {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds guilds.members.read',
  })

  const url = `https://discord.com/api/oauth2/authorize?${params.toString()}`

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  }
}
