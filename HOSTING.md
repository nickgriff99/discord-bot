# Simple Deployment Guide

## Host Your Bot 24/7

### Railway (Recommended - $5/month unlimited)
1. Push code to GitHub
2. Connect Railway to your GitHub repo
3. Set environment variables in Railway dashboard:
   - `DISCORD_BOT_TOKEN`: Your bot token
   - `DISCORD_CLIENT_ID`: Your bot client ID  
   - `YOUTUBE_API_KEY`: Your YouTube API key
   - `NODE_ENV`: production
4. Deploy - your bot serves unlimited Discord servers!

### Render ($7/month unlimited)
1. Connect GitHub repo to Render
2. Create new Web Service
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add environment variables
6. Deploy

### VPS (DigitalOcean, Linode, etc - $5-10/month)
```bash
# On your server
git clone your-repo
cd discord-bot
npm install
pm2 start index.js --name discord-bot
pm2 startup
pm2 save
```

## Bot Invitation Link

Generate your bot invite link at Discord Developer Portal:
- Scopes: `bot`, `applications.commands`
- Permissions: Send Messages, Use Slash Commands, Connect, Speak, Use Voice Activity

Users simply click the link to add your bot to their servers!
