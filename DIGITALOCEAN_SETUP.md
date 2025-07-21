# DigitalOcean VPS Deployment Guide

## Why DigitalOcean?
- **Dedicated IP**: No YouTube bot detection issues
- **Cost Effective**: $6/month for 1GB RAM, 1 vCPU
- **Reliable**: 99.99% uptime SLA
- **Full Control**: Complete server access for optimization

## Prerequisites
- DigitalOcean account
- SSH client (built into Windows 10/11)
- Your bot's Discord token
- YouTube Data API key

## Step 1: Create DigitalOcean Droplet

1. **Login to DigitalOcean**
   - Visit https://cloud.digitalocean.com/
   - Create account if needed

2. **Create New Droplet**
   - Click "Create" → "Droplets"
   - **Image**: Ubuntu 22.04 (LTS) x64
   - **Plan**: Basic ($6/month, 1GB/1CPU)
   - **Datacenter**: Choose closest to you
   - **Authentication**: SSH Key (recommended) or Password
   - **Hostname**: discord-bot-server

3. **Note Your Server Details**
   - Save the IP address
   - Save the root password (if using password auth)

## Step 2: Connect to Your Server

```bash
# Connect via SSH (replace YOUR_IP with actual IP)
ssh root@YOUR_IP

# If using SSH key, add your key first
ssh-copy-id root@YOUR_IP
```

## Step 3: Server Setup

### Update System
```bash
apt update && apt upgrade -y
```

### Install Node.js 20 (LTS)
```bash
# Install NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### Install Additional Dependencies
```bash
# Install Python for node-gyp
apt install -y python3 python3-pip build-essential

# Install ffmpeg for audio processing
apt install -y ffmpeg

# Install git
apt install -y git
```

## Step 4: Deploy Your Bot

### Clone Repository
```bash
# Navigate to home directory
cd /root

# Clone your repository (replace with your GitHub URL)
git clone https://github.com/YOURUSERNAME/discord-bot.git

# Navigate to bot directory
cd discord-bot
```

### Install Dependencies
```bash
npm install
```

### Configure Environment
```bash
# Create .env file
nano .env
```

Add your environment variables:
```env
DISCORD_TOKEN=your_discord_bot_token_here
YOUTUBE_API_KEY=your_youtube_api_key_here
NODE_ENV=production
```

Save and exit (Ctrl+X, Y, Enter)

## Step 5: Start Bot with PM2

### Create PM2 Configuration
```bash
nano ecosystem.config.js
```

Add PM2 configuration:
```javascript
module.exports = {
  apps: [{
    name: 'discord-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Create Logs Directory
```bash
mkdir logs
```

### Start Bot
```bash
# Start bot with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on server reboot
pm2 startup
```

## Step 6: Monitor Your Bot

### PM2 Commands
```bash
# View bot status
pm2 status

# View logs (real-time)
pm2 logs discord-bot

# Restart bot
pm2 restart discord-bot

# Stop bot
pm2 stop discord-bot

# View detailed info
pm2 show discord-bot
```

### System Monitoring
```bash
# Check server resources
htop

# Check disk space
df -h

# Check memory usage
free -h
```

## Step 7: Firewall Setup (Optional but Recommended)

```bash
# Install UFW
apt install -y ufw

# Allow SSH
ufw allow ssh

# Allow specific ports if needed (usually not required for Discord bots)
# ufw allow 3000

# Enable firewall
ufw enable
```

## Step 8: Auto-Updates (Optional)

### Create Update Script
```bash
nano update-bot.sh
```

Add update script:
```bash
#!/bin/bash
cd /root/discord-bot
git pull origin main
npm install
pm2 restart discord-bot
echo "Bot updated successfully at $(date)"
```

Make executable:
```bash
chmod +x update-bot.sh
```

### Schedule Regular Updates (Optional)
```bash
# Edit crontab
crontab -e

# Add line to update daily at 3 AM
0 3 * * * /root/discord-bot/update-bot.sh >> /root/discord-bot/logs/update.log 2>&1
```

## Step 9: Domain Setup (Optional)

If you want a custom domain for monitoring:

1. **Purchase Domain** (optional)
2. **Configure DNS** to point to your droplet IP
3. **Install Nginx** for reverse proxy
4. **Setup SSL** with Let's Encrypt

## Troubleshooting

### Bot Won't Start
```bash
# Check logs
pm2 logs discord-bot

# Check Node.js version
node --version

# Check if all dependencies installed
npm install
```

### YouTube Not Working
```bash
# Test internet connectivity
ping youtube.com

# Check ffmpeg installation
ffmpeg -version

# Verify environment variables
cat .env
```

### Server Performance Issues
```bash
# Check memory usage
free -h

# Check CPU usage
top

# Check disk space
df -h

# Restart PM2 if needed
pm2 restart all
```

### Update Bot Code
```bash
cd /root/discord-bot
git pull origin main
npm install
pm2 restart discord-bot
```

## Security Best Practices

1. **Regular Updates**
   ```bash
   apt update && apt upgrade -y
   ```

2. **SSH Key Authentication**
   - Disable password authentication
   - Use SSH keys only

3. **Firewall**
   - Only allow necessary ports
   - Use UFW or iptables

4. **Monitoring**
   - Set up log rotation
   - Monitor resource usage
   - Set up alerts for downtime

## Cost Optimization

- **Droplet Size**: Start with $6/month (1GB RAM)
- **Monitoring**: Use DigitalOcean monitoring (free)
- **Backups**: Enable weekly backups (+$1.20/month)
- **Snapshots**: Create snapshots before major changes

## Support

- **DigitalOcean Docs**: https://docs.digitalocean.com/
- **Community**: https://www.digitalocean.com/community/
- **PM2 Docs**: https://pm2.keymetrics.io/docs/

Your Discord bot is now running on a dedicated VPS with full YouTube streaming capabilities!
