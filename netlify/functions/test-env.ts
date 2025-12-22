import type { Handler } from '@netlify/functions'

export const handler: Handler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      client_id: process.env.DISCORD_CLIENT_ID ? 'SET' : 'MISSING',
      redirect_uri: process.env.DISCORD_REDIRECT_URI ? 'SET' : 'MISSING',
      client_secret: process.env.DISCORD_CLIENT_SECRET ? 'SET' : 'MISSING',
      bot_token: process.env.DISCORD_BOT_TOKEN ? 'SET' : 'MISSING',
      actual_client_id: process.env.DISCORD_CLIENT_ID,
      actual_redirect_uri: process.env.DISCORD_REDIRECT_URI,
    }),
  }
}
