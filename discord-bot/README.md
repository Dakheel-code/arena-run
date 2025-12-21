# 🤖 Swaplist Discord Bot

Discord bot for managing the Swaplist video platform directly from Discord.

## 📋 Features

The bot provides the following slash commands:

### `/publish <video_id>`
Publish a video to make it visible to all users.
- **Parameters:** `video_id` (UUID of the video)
- **Permissions:** Administrator only
- **Example:** `/publish 123e4567-e89b-12d3-a456-426614174000`

### `/unpublish <video_id>`
Unpublish a video to hide it from regular users.
- **Parameters:** `video_id` (UUID of the video)
- **Permissions:** Administrator only
- **Example:** `/unpublish 123e4567-e89b-12d3-a456-426614174000`

### `/delete <video_id>`
Permanently delete a video from both the database and Cloudflare Stream.
- **Parameters:** `video_id` (UUID of the video)
- **Permissions:** Administrator only
- **Example:** `/delete 123e4567-e89b-12d3-a456-426614174000`
- **⚠️ Warning:** This action cannot be undone!

### `/sessions <discord_id>`
Get the last 10 login sessions for a specific member.
- **Parameters:** `discord_id` (Discord ID of the member)
- **Permissions:** Administrator only
- **Example:** `/sessions 123456789012345678`
- **Shows:** Video watched, duration, country, and timestamp for each session

## 🚀 Setup Instructions

### 1. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section and click "Add Bot"
4. Enable these **Privileged Gateway Intents**:
   - Server Members Intent
   - Message Content Intent
5. Copy the bot token (you'll need this for `.env`)
6. Go to "OAuth2" → "General"
   - Copy the Client ID (you'll need this for `.env`)
7. Go to "OAuth2" → "URL Generator"
   - Select scopes: `bot`, `applications.commands`
   - Select bot permissions: `Administrator` (or at minimum: `Send Messages`, `Use Slash Commands`)
   - Copy the generated URL and open it to invite the bot to your server

### 2. Install Dependencies

```bash
cd discord-bot
npm install
```

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in your credentials in `.env`:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_from_step_1.5
DISCORD_CLIENT_ID=your_client_id_from_step_1.6
DISCORD_GUILD_ID=your_server_id

# Supabase Configuration (same as main project)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Cloudflare Stream Configuration (same as main project)
CF_ACCOUNT_ID=your_cloudflare_account_id
CF_STREAM_API_TOKEN=your_cloudflare_stream_api_token
```

**To get your Guild ID (Server ID):**
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click your server icon → Copy ID

### 4. Run the Bot

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## 📝 Usage Examples

### Publishing a Video
1. Get the video ID from the admin panel (Videos page)
2. Use the command: `/publish 123e4567-e89b-12d3-a456-426614174000`
3. The bot will confirm the action with an embed showing video details

### Checking Member Sessions
1. Get the Discord ID of the member (right-click user → Copy ID)
2. Use the command: `/sessions 123456789012345678`
3. The bot will show the last 10 sessions with:
   - Video title
   - Watch duration
   - Country
   - Timestamp

### Deleting a Video
1. Get the video ID from the admin panel
2. Use the command: `/delete 123e4567-e89b-12d3-a456-426614174000`
3. Confirm you want to delete (this is permanent!)

## 🔒 Security

- Only users with **Administrator** permissions can use these commands
- The bot uses the Supabase Service Role Key for full database access
- All commands are logged in the console
- Failed operations return error messages only visible to the command user (ephemeral)

## 🛠️ Troubleshooting

### Bot doesn't respond to commands
- Make sure the bot is online (check console for "Bot logged in as...")
- Verify the bot has proper permissions in your server
- Check that slash commands are registered (console should show "Slash commands registered successfully!")

### "Video not found" error
- Double-check the video ID is correct (UUID format)
- Verify the video exists in the database

### "Member not found" error
- Verify the Discord ID is correct
- Make sure the member exists in the members table

### Commands not showing up
- Wait a few minutes for Discord to sync the commands
- Try kicking and re-inviting the bot
- Make sure you used the correct Guild ID in `.env`

## 📦 Dependencies

- **discord.js** (v14) - Discord API wrapper
- **@supabase/supabase-js** (v2) - Supabase client
- **dotenv** - Environment variables management

## 🔄 Updating

To update dependencies:
```bash
npm update
```

## 📞 Support

For issues or questions, check the main project documentation or contact the development team.

## ⚠️ Important Notes

- The bot requires the same environment variables as the main project (Supabase, Cloudflare)
- Make sure to keep your `.env` file secure and never commit it to version control
- The bot operates with full admin privileges - use carefully!
- Deleted videos cannot be recovered
