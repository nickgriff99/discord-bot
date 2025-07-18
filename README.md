# Discord YouTube Music Bot

A Discord bot that plays music from YouTube directly in Discord voice channels using Google's YouTube Data API. No additional software installation required!

## Features

- 🎵 Play music from YouTube directly in Discord voice channels
- ⏯️ Full playback controls (play, pause, resume, skip, previous, stop)
- 🔊 Volume control
- 📋 Queue management
- 🎭 Now playing display
- 🔄 Repeat modes (none, track, queue)
- 🎮 Easy-to-use slash commands
- 🚀 Seamless setup - just add to your Discord server!

## Quick Setup

### 1. Get API Keys

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
6. (Optional) Restrict the API key to YouTube Data API v3 for security

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_GUILD_ID=your_discord_guild_id

# YouTube API Configuration
YOUTUBE_API_KEY=your_youtube_api_key
```

### 4. Run the Bot

## Commands

| Command | Description | Usage |
|---------|-------------|--------|
| `/play <query>` | Play a song from YouTube | `/play never gonna give you up` |
| `/pause` | Pause current playback | `/pause` |
| `/resume` | Resume paused playback | `/resume` |
| `/skip` | Skip to next song | `/skip` |
| `/previous` | Go to previous song | `/previous` |
| `/volume <level>` | Set volume (0-100) | `/volume 50` |
| `/nowplaying` | Show current song info | `/nowplaying` |
| `/queue` | Show current queue | `/queue` |
| `/stop` | Stop playback and clear queue | `/stop` |
| `/join` | Join your voice channel | `/join` |
| `/leave` | Leave voice channel | `/leave` |

## Usage

1. **Join a voice channel** in your Discord server
2. **Use `/play <song name>`** to start playing music
3. **Use other commands** to control playback

The bot will automatically:
- Join your voice channel when you use `/play`
- Search YouTube for your query
- Play the best match
- Show what's currently playing
- Manage the queue automatically

## Project Structure

```
discord-bot/
├── index.js          # Main bot application
├── youtube-api.js    # YouTube API integration
├── utils.js          # Utility functions
├── package.json      # Dependencies
└── README.md         # This file
```

## Troubleshooting

### Common Issues

**"You need to be in a voice channel"**
- Solution: Join a voice channel before using music commands

**"No results found"**
- Solution: Try different search terms or check your internet connection

**"An error occurred while playing"**
- Solution: Check your YouTube API key and quota limits

**Bot not responding**
- Solution: Check bot permissions and ensure it's online

### API Limits

The YouTube Data API has daily quotas:
- **Free tier**: 10,000 units/day
- **Each search**: ~100 units
- **Each play**: ~1-3 units

Monitor your usage in the Google Cloud Console.

## License

MIT License - feel free to use and modify!

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the [Discord.js documentation](https://discord.js.org/)
3. Check [YouTube Data API documentation](https://developers.google.com/youtube/v3)

---

**Note**: This bot streams audio directly from YouTube to Discord voice channels. Make sure you comply with YouTube's Terms of Service and Discord's Terms of Service when using this bot.
