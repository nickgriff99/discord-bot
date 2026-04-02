# Optional Hosting Guide

This project is designed for local-first development and testing.

Use hosting only when you are ready, and verify voice streaming stability in your target environment before sharing publicly.

## Required Environment Variables

- `DISCORD_BOT_TOKEN`
- `DISCORD_CLIENT_ID`
- `YOUTUBE_API_KEY`
- `NODE_ENV=production`

## Railway

1. Push this repository to GitHub
2. Create a Railway project from that repo
3. Add the required environment variables
4. Deploy with `npm start`

## Render

1. Connect your repo in Render
2. Create a Web Service
3. Build command: `npm install`
4. Start command: `npm start`
5. Add required environment variables and deploy

## VPS (PM2)

```bash
git clone <your-repo-url>
cd discord-bot
npm install
pm2 start index.js --name discord-bot
pm2 startup
pm2 save
```

## Invite Link Setup

In Discord Developer Portal URL Generator:

- Scopes: `bot`, `applications.commands`
- Permissions: `Send Messages`, `Use Slash Commands`, `Connect`, `Speak`, `Use Voice Activity`
