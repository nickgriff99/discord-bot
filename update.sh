#!/bin/bash

# Discord Bot Update Script
# Use this to update your bot on DigitalOcean

echo "🔄 Updating Discord Bot..."

# Navigate to bot directory
cd /root/discord-bot

# Pull latest changes
echo "📦 Pulling latest changes from GitHub..."
git pull origin main

# Install any new dependencies
echo "📦 Installing dependencies..."
npm install

# Restart bot
echo "🔄 Restarting bot..."
pm2 restart discord-bot

# Show status
echo "📊 Bot Status:"
pm2 status

echo "✅ Bot updated successfully!"
echo ""
echo "📝 View logs with: pm2 logs discord-bot"
