import { Client, GatewayIntentBits, ActivityType, SlashCommandBuilder, REST, Routes } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import dotenv from 'dotenv';
import YouTubeAPI from './youtube-api.js';
import { createLogger, createValidator, ValidationRules, sanitizeInput } from './utils.js';

dotenv.config();

const logger = createLogger('DiscordBot');

class YouTubeMusicDiscordBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
      ]
    });

    this.commands = new Map();
    this.youtubeAPI = new YouTubeAPI();
    this.setupCommands();
    this.setupEvents();
  }

  setupCommands() {
    const commands = [
      { name: 'play', description: 'CORRECT play a song in the voice channel', options: [{ name: 'query', description: 'Song name or search query', type: 'STRING', required: true }] },
      { name: 'pause', description: 'CORRECT Pause the current song' },
      { name: 'resume', description: 'CORRECT Resume playback' },
      { name: 'skip', description: 'CORRECT Skip to the next song' },
      { name: 'previous', description: 'CORRECT Go to the previous song' },
      { name: 'volume', description: 'CORRECT Set the volume', options: [{ name: 'level', description: 'Volume level (0-100)', type: 'INTEGER', required: true, minValue: 0, maxValue: 100 }] },
      { name: 'nowplaying', description: 'CORRECT Show current song info' },
      { name: 'queue', description: 'CORRECT Show the current queue' },
      { name: 'stop', description: 'CORRECT Stop playback and clear queue' },
      { name: 'join', description: 'CORRECT Join your voice channel' },
      { name: 'leave', description: 'CORRECT Leave the voice channel' },
      { name: 'debug', description: 'CORRECT Show bot system status' }
    ];

    this.commandsData = commands.map(cmd => {
      const builder = new SlashCommandBuilder().setName(cmd.name).setDescription(cmd.description);
      
      if (cmd.options) {
        cmd.options.forEach(opt => {
          if (opt.type === 'STRING') {
            builder.addStringOption(option => 
              option.setName(opt.name).setDescription(opt.description).setRequired(opt.required || false)
            );
          } else if (opt.type === 'INTEGER') {
            builder.addIntegerOption(option => {
              const intOption = option.setName(opt.name).setDescription(opt.description).setRequired(opt.required || false);
              if (opt.minValue !== undefined) intOption.setMinValue(opt.minValue);
              if (opt.maxValue !== undefined) intOption.setMaxValue(opt.maxValue);
              return intOption;
            });
          }
        });
      }
      
      this.commands.set(cmd.name, builder);
      return builder.toJSON();
    });
  }

  setupEvents() {
    this.client.once('ready', async () => {
      logger.info(`Bot ready: ${this.client.user.tag}`);
      logger.info(`Serving ${this.client.guilds.cache.size} Discord servers`);
      
      try {
        await this.youtubeAPI.initializeDistube(this.client);
        logger.info('✅ DisTube initialization completed successfully');
      } catch (error) {
        logger.error('❌ DisTube initialization failed:', error.message);
        setTimeout(async () => {
          try {
            await this.youtubeAPI.initializeDistube(this.client);
            logger.info('✅ DisTube retry successful');
          } catch (retryError) {
            logger.error('❌ DisTube retry failed:', retryError.message);
          }
        }, 5000);
      }
      
      this.updatePresence('🎵 Ready to play music');
    });

    this.client.on('error', (error) => {
      logger.error('Discord error:', error.message);
    });

    this.client.on('guildCreate', (guild) => {
      logger.info(`Bot added to new server: ${guild.name} (${guild.id})`);
      logger.info(`Now serving ${this.client.guilds.cache.size} Discord servers`);
    });

    this.client.on('guildDelete', (guild) => {
      logger.info(`Bot removed from server: ${guild.name} (${guild.id})`);
      logger.info(`Now serving ${this.client.guilds.cache.size} Discord servers`);
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = interaction.commandName;
      logger.info(`Command: ${command} from ${interaction.user.tag} in ${interaction.guild?.name || 'DM'}`);

      if (!interaction.guild) {
        try {
          await interaction.reply({ content: 'This bot only works in servers, not in DMs!', flags: 64 });
        } catch (error) {
          logger.error('Failed to respond to DM interaction:', error.message);
        }
        return;
      }

      try {
        await this.handleCommand(interaction);
      } catch (error) {
        await this.handleInteractionError(interaction, error, command);
      }
    });
  }

  async handleInteractionError(interaction, error, commandName) {
    logger.error(`Error handling command ${commandName}:`, error.message);
    
    try {
      const errorMessage = 'There was an error executing this command!';
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: errorMessage, flags: 64 });
      } else if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.followUp({ content: errorMessage, flags: 64 });
      }
    } catch (replyError) {
      logger.error('Failed to send error response:', replyError.message);
    }
  }

  async validateVoiceChannel(interaction) {
    if (!interaction.member.voice.channel) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ You must be in a voice channel to use this command!', flags: 64 });
      } else {
        await interaction.editReply('❌ You must be in a voice channel to use this command!');
      }
      return false;
    }
    return true;
  }

  async handleCommand(interaction) {
    const command = interaction.commandName;
    const handlers = {
      'play': () => this.handlePlay(interaction),
      'pause': () => this.handlePause(interaction),
      'resume': () => this.handleResume(interaction),
      'skip': () => this.handleSkip(interaction),
      'previous': () => this.handlePrevious(interaction),
      'volume': () => this.handleVolume(interaction),
      'nowplaying': () => this.handleNowPlaying(interaction),
      'queue': () => this.handleQueue(interaction),
      'stop': () => this.handleStop(interaction),
      'join': () => this.handleJoin(interaction),
      'leave': () => this.handleLeave(interaction),
      'debug': () => this.handleDebug(interaction)
    };

    const handler = handlers[command];
    if (handler) {
      await handler();
    } else {
      await interaction.reply({ content: 'Unknown command!', flags: 64 });
    }
  }

  async handlePlay(interaction) {
    const query = sanitizeInput(interaction.options.getString('query'));
    
    if (!query) {
      await interaction.reply({ content: 'Please provide a valid song name or URL!', flags: 64 });
      return;
    }

    if (!await this.validateVoiceChannel(interaction)) return;

    await interaction.deferReply();

    try {
      const result = await this.youtubeAPI.play(interaction, query);
      
      if (result.success) {
        const emoji = result.addedToQueue ? '➕' : '🎵';
        await interaction.editReply(`${emoji} ${result.message}\n**Channel:** ${result.track.channel}`);
        
        if (!result.addedToQueue) {
          this.updatePresence(`🎵 ${result.track.title}`);
        }
      } else {
        await interaction.editReply(`❌ ${result.message}`);
      }
    } catch (error) {
      logger.error('Error in play command:', error);
      try {
        await interaction.editReply('❌ An error occurred while playing the song.');
      } catch (editError) {
        logger.error('Failed to edit reply:', editError.message);
      }
    }
  }

  async handlePause(interaction) {
    await interaction.deferReply();
    const result = this.youtubeAPI.pause(interaction.guildId);
    
    if (result.success) {
      await interaction.editReply('⏸️ Paused playback');
      this.updatePresence('⏸️ Paused');
    } else {
      await interaction.editReply(`❌ ${result.message}`);
    }
  }

  async handleResume(interaction) {
    await interaction.deferReply();
    const result = this.youtubeAPI.resume(interaction.guildId);
    
    if (result.success) {
      await interaction.editReply('▶️ Resumed playback');
      const current = this.youtubeAPI.getCurrentTrack(interaction.guildId);
      this.updatePresence(`🎵 ${current.track?.title || 'Playing'}`);
    } else {
      await interaction.editReply(`❌ ${result.message}`);
    }
  }

  async handleSkip(interaction) {
    await interaction.deferReply();
    const result = this.youtubeAPI.skip(interaction.guildId);
    
    if (result.success) {
      await interaction.editReply('⏭️ Skipped to next song');
      const current = this.youtubeAPI.getCurrentTrack(interaction.guildId);
      this.updatePresence(`🎵 ${current.track?.title || 'Playing'}`);
    } else {
      await interaction.editReply(`❌ ${result.message}`);
    }
  }

  async handlePrevious(interaction) {
    await interaction.deferReply();
    const result = this.youtubeAPI.previous(interaction.guildId);
    
    if (result.success) {
      await interaction.editReply('⏮️ Playing previous song');
      const current = this.youtubeAPI.getCurrentTrack(interaction.guildId);
      this.updatePresence(`🎵 ${current.track?.title || 'Playing'}`);
    } else {
      await interaction.editReply(`❌ ${result.message}`);
    }
  }

  async handleVolume(interaction) {
    const level = interaction.options.getInteger('level');
    
    await interaction.deferReply();
    
    const result = this.youtubeAPI.setVolume(interaction.guildId, level);
    
    if (result.success) {
      await interaction.editReply(`🔊 Volume set to ${result.volume}%`);
    } else {
      await interaction.editReply(`❌ ${result.message}`);
    }
  }

  async handleNowPlaying(interaction) {
    await interaction.deferReply();
    
    const current = this.youtubeAPI.getCurrentTrack(interaction.guildId);
    
    if (current.track) {
      const statusEmoji = current.isPlaying ? '🎵' : '⏸️';
      const repeatEmoji = current.repeatMode === 'track' ? '🔂' : current.repeatMode === 'queue' ? '🔁' : '';
      
      await interaction.editReply(`${statusEmoji} **Now Playing**\n**${current.track.title}**\nby *${current.track.channel}*\n\n🔊 Volume: ${current.volume}%\n${repeatEmoji} Repeat: ${current.repeatMode}\n📋 Queue: ${current.queue} songs`);
    } else {
      await interaction.editReply('❌ No song is currently playing.');
    }
  }

  async handleQueue(interaction) {
    await interaction.deferReply();
    
    const queueInfo = this.youtubeAPI.getQueue(interaction.guildId);
    
    if (queueInfo.current) {
      let message = `🎵 **Now Playing:**\n${queueInfo.current.title} by *${queueInfo.current.channel}*\n\n`;
      
      if (queueInfo.queue.length > 0) {
        message += `📋 **Queue (${queueInfo.queue.length} songs):**\n`;
        queueInfo.queue.slice(0, 10).forEach((track, index) => {
          message += `${index + 1}. ${track.title} by *${track.channel}*\n`;
        });
        
        if (queueInfo.queue.length > 10) {
          message += `... and ${queueInfo.queue.length - 10} more songs`;
        }
      } else {
        message += '📋 Queue is empty';
      }
      
      await interaction.editReply(message);
    } else {
      await interaction.editReply('❌ Queue is empty.');
    }
  }

  async handleStop(interaction) {
    await interaction.deferReply();
    const result = this.youtubeAPI.stop(interaction.guildId);
    
    if (result.success) {
      await interaction.editReply('⏹️ Stopped playback and cleared queue');
      this.updatePresence('🎵 Ready to play music');
    } else {
      await interaction.editReply(`❌ ${result.message}`);
    }
  }

  async handleJoin(interaction) {
    if (!await this.validateVoiceChannel(interaction)) return;
    
    await interaction.deferReply();
    
    const connection = getVoiceConnection(interaction.guild.id);
    if (connection) {
      await interaction.editReply('✅ Already connected to voice channel!');
    } else {
      await interaction.editReply('✅ Use /play to join and start playing music!');
    }
  }

  async handleLeave(interaction) {
    await interaction.deferReply();
    
    const connection = getVoiceConnection(interaction.guild.id);
    if (connection) {
      this.youtubeAPI.stop(interaction.guildId);
      connection.destroy();
      await interaction.editReply('✅ Left voice channel!');
      this.updatePresence('🎵 Ready to play music');
    } else {
      await interaction.editReply('❌ Not connected to a voice channel.');
    }
  }

  async handleDebug(interaction) {
    await interaction.deferReply();
    
    const distubeStatus = this.youtubeAPI.distube ? '✅ Initialized' : '❌ Not Initialized';
    const nodeVersion = process.version;
    const uptime = Math.floor(process.uptime());
    const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    
    await interaction.editReply({
      content: '🔧 **Bot Debug Info**\n\n' +
              `**DisTube Status:** ${distubeStatus}\n` +
              `**Node.js Version:** ${nodeVersion}\n` +
              `**Uptime:** ${uptime} seconds\n` +
              `**Memory Usage:** ${memory} MB\n` +
              `**Environment:** ${process.env.NODE_ENV || 'development'}\n` +
              `**Servers:** ${this.client.guilds.cache.size}`
    });
  }

  async checkYouTubeMusicStatus() {
    return false;
  }

  updatePresence(activity) {
    this.client.user.setPresence({
      activities: [{ name: activity, type: ActivityType.Listening }],
      status: 'online'
    });
  }

  async registerCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

    try {
      logger.info('Starting command registration...');

      const globalRoute = Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);
      
      if (process.env.DISCORD_GUILD_ID) {
        const guildRoute = Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID);
        
        logger.info('Registering commands to guild for instant availability...');
        await rest.put(guildRoute, { body: this.commandsData });
        logger.info(`Registered ${this.commandsData.length} commands to guild ${process.env.DISCORD_GUILD_ID}`);
      } else {
        logger.info('Registering commands globally...');
        await rest.put(globalRoute, { body: this.commandsData });
        logger.info(`Registered ${this.commandsData.length} commands globally`);
      }
    } catch (error) {
      logger.error('Command registration failed:', error);
      throw error;
    }
  }

  async start() {
    const validator = createValidator({
      DISCORD_BOT_TOKEN: { ...ValidationRules.required, ...ValidationRules.string },
      DISCORD_CLIENT_ID: { ...ValidationRules.required, ...ValidationRules.string },
      YOUTUBE_API_KEY: { ...ValidationRules.required, ...ValidationRules.string }
    });

    const validation = validator({
      DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
      DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
      YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY
    });

    if (!validation.valid) {
      logger.error('Invalid environment configuration:', validation.errors);
      process.exit(1);
    }

    await this.registerCommands();
    await this.client.login(process.env.DISCORD_BOT_TOKEN);
  }
}

const bot = new YouTubeMusicDiscordBot();

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

bot.start().catch(error => {
  logger.error('Failed to start bot:', error);
  process.exit(1);
});
