# Discord YouTube Music Bot

A local-first Discord music bot that plays YouTube audio in voice channels, with slash-command controls and queue management.

## Features

- Slash commands for playback
- Queue and now playing
- Volume `0–100`
- `/debug` for basic runtime info
- Multi-guild
- Static pages in `web/` (served when the bot starts)

## Prerequisites

- Node.js `18+`
- A Discord application and bot token
- A YouTube Data API v3 key
- FFmpeg available (the app uses `ffmpeg-static` and falls back to system FFmpeg)

## Quick Start (Local)

1. Install dependencies:

```bash
npm install
```

2. Create `.env` in the project root:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
YOUTUBE_API_KEY=your_youtube_api_key
# Optional for instant slash command updates in one server
DISCORD_GUILD_ID=your_test_server_id
```

3. Start the bot (also serves `web/` over HTTP):

```bash
npm start
```

The terminal prints the URL (default `http://localhost:4173`). Optional: `WEB_PORT` in `.env`.

4. For development with auto-restart:

```bash
npm run dev
```

## `web/` site

Static HTML: home, how to run, command list. Served with `npm start` / `npm run dev`.

HTTP only (no bot):

```bash
npm run web:start
```

Development mode (auto-restart the web server process):

```bash
npm run web:dev
```

## Discord Setup

1. Open [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. In **Bot**, create a bot user and copy the bot token
4. In **General Information**, copy the **Application ID** (used as `DISCORD_CLIENT_ID`)
5. In **OAuth2 > URL Generator**:
- Scopes: `bot`, `applications.commands`
- Bot Permissions: `Send Messages`, `Use Slash Commands`, `Connect`, `Speak`, `Use Voice Activity`
6. Open generated invite URL and add bot to your server

## YouTube API Setup

1. Open [Google Cloud Console](https://console.cloud.google.com)
2. Create/select a project
3. Enable **YouTube Data API v3**
4. Create an API key and place it in `.env` as `YOUTUBE_API_KEY`

## Commands

- `/play query:<song or search>`: Search YouTube and play/queue the first result
- `/pause`: Pause playback
- `/resume`: Resume playback
- `/skip`: Skip to next track
- `/previous`: Return to previous track
- `/volume level:<0-100>`: Set volume
- `/nowplaying`: Show current track details
- `/queue`: Show queue snapshot
- `/stop`: Stop and clear queue
- `/join`: Voice channel readiness helper
- `/leave`: Disconnect from voice
- `/debug`: Show runtime diagnostics

## Scripts

- `npm start`: Bot + HTTP for `web/`
- `npm run dev`: Same with `--watch`
- `npm run web:start`: HTTP only
- `npm run web:dev`: HTTP only with `--watch`
- `npm run lint`: Lint codebase
- `npm run lint:fix`: Auto-fix lint issues

## Troubleshooting

- `Invalid environment configuration`: verify `.env` values and names
- Slash commands not appearing: set `DISCORD_GUILD_ID` for test server and restart
- Voice/playback errors: confirm you are in a voice channel and bot has `Connect` + `Speak` permissions
- Playback stops quickly on hosted runtimes: this project is optimized for local usage first; treat hosted deployment as optional and test carefully

## Deployment

Local usage is the default workflow. Optional hosting notes are documented in `HOSTING.md`.

## License

MIT
