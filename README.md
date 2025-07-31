# Discord YouTube Music Bot

🎵 **A Discord music bot that plays YouTube music in voice channels**

## Local Hosting Only

This bot is currently **not deployed** and requires local hosting. Run it using:
```bash
node index.js
```

## Commands

- 🎵 `/play <song>` - Play or queue a song from YouTube
- ⏸️ `/pause` - Pause the current song
- ▶️ `/resume` - Resume playback
- ⏭️ `/skip` - Skip to next song
- ⏮️ `/previous` - Go to previous song
- 📋 `/queue` - Show current queue
- 🎭 `/nowplaying` - Show current song info with repeat mode and volume
- 🔊 `/volume <0-100>` - Set volume level
- ⏹️ `/stop` - Stop playback and clear queue
- ➡️ `/join` - Join your voice channel
- ⬅️ `/leave` - Leave voice channel
- 🔧 `/debug` - Show bot system status

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Get API Keys

#### Discord Bot Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token
5. Under "OAuth2 > URL Generator", select:
   - **Scopes**: `bot`, `applications.commands`
   - **Bot Permissions**: `Send Messages`, `Use Slash Commands`, `Connect`, `Speak`, `Use Voice Activity`
6. Use the generated URL to invite the bot to your server

#### YouTube Data API Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable the **YouTube Data API v3**
4. Go to "Credentials" > "Create Credentials" > "API Key"
5. Copy the API key

### 3. Configure Environment

Create a `.env` file:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
YOUTUBE_API_KEY=your_youtube_api_key
```

## Usage

1. Start the bot: `node index.js`
2. Join a voice channel in your Discord server
3. Use `/play <song name>` to start playing music
4. Use other commands to control playback
