# Optional hosting guide

The bot is a long-running Node process. The marketing site in `web/` is a separate Vite React build (`web/dist/`) and can be hosted as **static files** (e.g. Netlify) without running the bot.

## Required environment variables (bot)

- `DISCORD_BOT_TOKEN`
- `DISCORD_CLIENT_ID`
- `YOUTUBE_API_KEY`
- `NODE_ENV=production` (typical for hosted bots)

Build step: **`npm run build`** (compiles TypeScript to `dist/` and the web app to `web/dist/`). Start: **`npm start`** (`node dist/index.js`).

## Netlify (static site only)

Use the repo’s `netlify.toml`: build command `npm run build:web`, publish directory `web/dist`. Do not expect the Discord bot to run on Netlify.

## Railway

1. Push the repository to GitHub
2. Create a Railway service from the repo
3. Set the environment variables above
4. Ensure the build runs `npm run build` (see `nixpacks.toml`) and start uses `npm start` or `node dist/index.js`

## Render

1. Connect the repository
2. Create a **Web Service**
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add environment variables and deploy

## VPS (PM2)

```bash
git clone <your-repo-url>
cd discord-bot
npm install
npm run build
pm2 start dist/index.js --name discord-bot
pm2 startup
pm2 save
```

## Invite link (Discord Developer Portal)

- Scopes: `bot`, `applications.commands`
- Permissions: `Send Messages`, `Use Slash Commands`, `Connect`, `Speak`, `Use Voice Activity`

You can also run `npm run invite` after editing `src/generate-invite.ts` with your client ID.
