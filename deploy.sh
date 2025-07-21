#!/bin/bash

# Discord Bot DigitalOcean Deployment Script
# Run this script on your DigitalOcean Ubuntu droplet

echo "🚀 Starting Discord Bot deployment on DigitalOcean..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 20 LTS
echo "📦 Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install required dependencies
echo "📦 Installing system dependencies..."
apt install -y python3 python3-pip build-essential ffmpeg git

# Install PM2 globally
echo "📦 Installing PM2 process manager..."
npm install -g pm2

# Verify installations
echo "✅ Verifying installations..."
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "FFmpeg version: $(ffmpeg -version | head -n1)"
echo "PM2 version: $(pm2 --version)"

# Create bot directory
echo "📁 Setting up bot directory..."
cd /root
rm -rf discord-bot  # Remove if exists

# Clone repository (replace with your GitHub URL)
echo "📦 Cloning repository..."
echo "⚠️  Replace this URL with your actual GitHub repository:"
echo "git clone https://github.com/YOURUSERNAME/discord-bot.git"
read -p "Enter your GitHub repository URL: " REPO_URL

if [ ! -z "$REPO_URL" ]; then
    git clone "$REPO_URL"
    cd discord-bot
else
    echo "❌ No repository URL provided. Please clone manually:"
    echo "git clone YOUR_REPO_URL"
    echo "cd discord-bot"
    exit 1
fi

# Install bot dependencies
echo "📦 Installing bot dependencies..."
npm install

# Create logs directory
mkdir -p logs

# Setup environment variables
echo "🔧 Setting up environment variables..."
echo "Please enter your bot credentials:"

read -p "Discord Bot Token: " DISCORD_TOKEN
read -p "YouTube API Key: " YOUTUBE_API_KEY

cat > .env << EOF
DISCORD_TOKEN=$DISCORD_TOKEN
YOUTUBE_API_KEY=$YOUTUBE_API_KEY
NODE_ENV=production
EOF

echo "✅ Environment variables saved to .env"

# Start bot with PM2
echo "🚀 Starting bot with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📊 Bot Status:"
pm2 status

echo ""
echo "📝 Useful Commands:"
echo "pm2 logs discord-bot     # View logs"
echo "pm2 restart discord-bot  # Restart bot"
echo "pm2 stop discord-bot     # Stop bot"
echo "pm2 status              # Check status"
echo ""
echo "🔧 Next Steps:"
echo "1. Copy the PM2 startup command that was displayed above"
echo "2. Run it to enable auto-start on server reboot"
echo "3. Test your bot in Discord!"
echo ""
echo "📋 Your bot is now running on DigitalOcean!"
