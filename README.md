# Discord Music Bot

A Discord bot that plays music from YouTube with advanced queue management and voice channel features.

## Features

- 🎵 Play music from YouTube
- 📝 Queue management (skip, stop, clear)
- 🔊 Voice channel controls (join, leave)
- 🎛️ Volume control (0-100%)
- 📋 Show current queue
- 🔍 YouTube search integration
- 🎯 Slash command interface

## Commands

- `/play <query>` - Play a song or add to queue
- `/skip` - Skip current song
- `/stop` - Stop playback and clear queue
- `/queue` - Show current queue
- `/volume <number>` - Set volume (0-100)
- `/nowplaying` - Show current song
- `/join` - Join your voice channel
- `/leave` - Leave voice channel
- `/clear` - Clear the queue

## Deployment

### DigitalOcean VPS (Recommended)
For reliable YouTube streaming without bot detection issues:

1. Follow the complete setup guide: [DIGITALOCEAN_SETUP.md](./DIGITALOCEAN_SETUP.md)
2. Benefits: Dedicated IP, no YouTube restrictions, $6/month
3. Full control over server environment

### Local Development
```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your tokens

# Run the bot
npm start
```

## Environment Variables

Create a `.env` file:
```env
DISCORD_TOKEN=your_discord_bot_token
YOUTUBE_API_KEY=your_youtube_api_key
NODE_ENV=development
```

## Requirements

- Node.js 18+ (20 LTS recommended)
- Discord Bot Token
- YouTube Data API v3 Key
- FFmpeg (for audio processing)

## Bot Permissions

Required Discord permissions:
- Send Messages
- Use Slash Commands
- Connect to Voice Channels
- Speak in Voice Channels
- Use Voice Activity

## Tech Stack

- **Discord.js v14**: Discord API wrapper
- **DisTube v5**: Music streaming engine
- **@distube/ytdl-core**: YouTube downloader
- **YouTube Data API v3**: Search functionality
- **PM2**: Process management (VPS deployment)

## Hosting Considerations

### ✅ Recommended Platforms
- **DigitalOcean VPS** - Dedicated IP, full control
- **Linode VPS** - Similar to DigitalOcean
- **AWS EC2** - More expensive but highly scalable
- **Local hosting** - Perfect for development/personal use

### ❌ Not Recommended
- **Railway** - YouTube bot detection blocks streaming
- **Heroku** - Limited audio processing capabilities
- **Vercel/Netlify** - Serverless incompatible with voice channels

## Getting Started

1. **Create Discord Application**
   - Go to https://discord.com/developers/applications
   - Create new application
   - Go to "Bot" section
   - Copy token

2. **Get YouTube API Key**
   - Go to Google Cloud Console
   - Enable YouTube Data API v3
   - Create credentials (API key)

3. **Invite Bot to Server**
   ```bash
   node generate-invite.js
   ```

4. **Deploy**
   - For VPS: Follow [DIGITALOCEAN_SETUP.md](./DIGITALOCEAN_SETUP.md)
   - For local: `npm start`

## Support

- Check logs: `pm2 logs discord-bot` (VPS) or console output (local)
- Verify bot permissions in Discord server
- Ensure voice channel connectivity
- Check YouTube API quota limits

## License

MIT License - Feel free to modify and distribute.
