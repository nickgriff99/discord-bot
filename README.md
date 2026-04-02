# Discord YouTube Music Bot

TypeScript Discord bot that plays YouTube audio in voice channels, with slash commands and a React + Vite docs site in `web/`.

## Features

- Slash commands for playback, queue, volume, and more
- `/debug` for basic runtime info
- Multi-guild
- **Web UI**: React (TSX), Tailwind CSS, Framer Motion — built to `web/dist/` and served over HTTP when the bot starts (unless `SKIP_WEB_SERVER` is set)

## Prerequisites

- Node.js **18+**
- Discord application and bot token
- YouTube Data API v3 key
- FFmpeg (`ffmpeg-static` bundled; can fall back to system FFmpeg)

## Quick start

1. **Install**

```bash
npm install
```

2. **Environment** — copy `.env.example` to `.env` and fill in:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
YOUTUBE_API_KEY=your_youtube_api_key
# Optional: instant slash updates in one guild while testing
# DISCORD_GUILD_ID=your_test_server_id
# Optional: HTTP port for static site (default 4173)
# WEB_PORT=4173
```

3. **Build and run** (compiles the bot to `dist/` and the site to `web/dist/`):

```bash
npm run build
npm start
```

The terminal prints the URL for the built site (e.g. `http://localhost:4173`). The static server serves **`web/dist`** (SPA).

### Development

| Command | Purpose |
|--------|---------|
| `npm run dev` | Bot only — `tsx watch` on `src/` (no `tsc` step) |
| `npm run dev:web` | Vite dev server for the React app (HMR), default port 5173 |
| `SKIP_WEB_SERVER=1 npm run dev` | Bot without binding HTTP — use with `dev:web` in another terminal |

After changing the web app, run `npm run build:web` (or use `dev:web`) so `web/dist` stays current if you rely on the bot’s HTTP server.

| Command | Purpose |
|--------|---------|
| `npm run build` | `build:web` then `build:bot` |
| `npm run build:web` | Vite → `web/dist` |
| `npm run build:bot` | `tsc` → `dist/` |
| `npm run web:start` | Serve `web/dist` only (`tsx src/web-server.ts`) |
| `npm run invite` | Print invite URL template (`tsx src/generate-invite.ts`) |
| `npm run lint` / `npm run lint:fix` | ESLint |

## Discord & YouTube setup

See the in-app **How to run** page (`/how-to-run` after build) or:

1. [Discord Developer Portal](https://discord.com/developers/applications) — bot token, Application ID, OAuth2 URL (scopes: `bot`, `applications.commands`; voice permissions as needed).
2. [Google Cloud Console](https://console.cloud.google.com) — enable **YouTube Data API v3**, create an API key.

## Slash commands

`/play`, `/pause`, `/resume`, `/skip`, `/previous`, `/volume`, `/nowplaying`, `/queue`, `/stop`, `/join`, `/leave`, `/debug` — details on `/commands` in the web app.

## Troubleshooting

- **`Invalid environment configuration`**: check `.env` names and values.
- **Slash commands missing**: set `DISCORD_GUILD_ID` for a test guild or wait for global registration.
- **404 on `/` when running the bot**: run `npm run build:web` so `web/dist` exists.
- **Voice issues**: confirm bot permissions (`Connect`, `Speak`) and that you are in a voice channel.
- **Connection timeout on /play**: first join can be slow (ffmpeg/yt-dlp). The bot waits up to **60s** by default; increase with `VOICE_CONNECT_TIMEOUT_MS` in `.env`. On Windows, allow **Node.js** through the firewall for **UDP**; VPNs often break Discord voice.
- **`DEP0190` in the console**: comes from a dependency spawning a subprocess on newer Node; it does not mean the bot failed. Safe to ignore until upstream fixes it.
- **No results / playback errors for YouTube**: the bot uses the **YouTube Data API v3** to search (check key, quota, and that the API is enabled in Google Cloud) and **yt-dlp** (via `@distube/yt-dlp`) to download audio. If search fails, check the server log for `YouTube Data API response` (403 often means quota or API not enabled). If search works but audio fails, YouTube may be blocking the host; try another network or update yt-dlp (`npx yt-dlp -U` if you use a global binary).

## Deployment

- **Netlify**: static site only — `npm run build:web`, publish `web/dist` (see `netlify.toml`). SPA fallback is configured.
- **Bot hosting** (Railway, Render, VPS, etc.): run `npm run build` then `npm start` (or `node dist/index.js`) with env vars set. See `HOSTING.md`.

## License

MIT
