import { Client, GatewayIntentBits, ActivityType, SlashCommandBuilder, REST, Routes } from 'discord.js';
import { joinVoiceChannel, getVoiceConnection } from '@discordjs/voice';
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
        GatewayIntentBits.GuildVoiceStates
      ]
    });

    this.commands = new Map();
    this.youtubeAPI = new YouTubeAPI();
    this.setupCommands();
    this.setupEvents();
  }

  setupCommands() {
    const commands = [
      { name: 'play', description: 'Play a song in the voice channel', options: [{ name: 'query', description: 'Song name or search query', type: 3, required: true }] },
      { name: 'pause', description: 'Pause the current song' },
      { name: 'resume', description: 'Resume playback' },
      { name: 'skip', description: 'Skip to the next song' },
      { name: 'previous', description: 'Go to the previous song' },
      { name: 'volume', description: 'Set the volume', options: [{ name: 'level', description: 'Volume level (0-100)', type: 4, required: true, minValue: 0, maxValue: 100 }] },
      { name: 'nowplaying', description: 'Show current song info' },
      { name: 'queue', description: 'Show the current queue' },
      { name: 'stop', description: 'Stop playback and clear queue' },
      { name: 'join', description: 'Join your voice channel' },
      { name: 'leave', description: 'Leave the voice channel' },
      { name: 'debug', description: 'Show bot system status' }
    ];

    this.commandsData = commands.map(cmd => {
      const builder = new SlashCommandBuilder().setName(cmd.name).setDescription(cmd.description);
      
      if (cmd.options) {
        cmd.options.forEach(opt => {
          if (opt.type === 3) {
            builder.addStringOption(option => 
              option.setName(opt.name).setDescription(opt.description).setRequired(opt.required || false)
            );
          } else if (opt.type === 4) {
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

      try {
        await this.handleCommand(interaction);
      } catch (error) {
        logger.error(`Error handling command ${command}:`, error.message);
        
        if (!interaction.replied && !interaction.deferred) {
          await this.sendErrorResponse(interaction, 'There was an error executing this command!');
        } else if (interaction.deferred) {
          try {
            await this.sendReply(interaction, 'There was an error executing this command!');
          } catch (editError) {
            logger.error('Failed to edit deferred reply:', editError.message);
          }
        }
      }
    });
  }

  async sendReply(interaction, content, ephemeral = false) {
    const options = { content };
    if (ephemeral) options.flags = 64;
    
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(options);
    } else {
      await interaction.reply(options);
    }
  }

  async validateVoiceChannel(interaction) {
    if (!interaction.member.voice.channel) {
      await this.sendReply(interaction, '❌ You must be in a voice channel to use this command!');
      return false;
    }
    return true;
  }

  async executeCommand(interaction, action) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }
    
    try {
      await action();
    } catch (error) {
      logger.error(`Error in ${interaction.commandName}:`, error);
      const actionText = interaction.commandName === 'play' ? 'playing' : 'executing';
      await this.sendReply(interaction, `❌ An error occurred while ${actionText} the command.`);
    }
  }

  async sendErrorResponse(interaction, message) {
    try {
      const responseOptions = { 
        content: message, 
        flags: 64
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(responseOptions);
      } else {
        await interaction.reply(responseOptions);
      }
    } catch (interactionError) {
      logger.error('Failed to send error message to user:', interactionError.message);
    }
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

  async getVoiceConnection(interaction) {
    const member = interaction.member;
    const voiceChannel = member?.voice?.channel;
    
    if (!voiceChannel) {
      await this.sendReply(interaction, '❌ You must be in a voice channel to use this command!');
      return null;
    }

    let connection = getVoiceConnection(interaction.guild.id);
    
    if (!connection) {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });
      
      connection.on('stateChange', (oldState, newState) => {
        if (newState.status === 'disconnected') {
          connection.destroy();
        }
      });

      connection.on('error', (error) => {
        console.error('Voice connection error:', error);
      });

      try {
        if (connection.state.status !== 'ready') {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Connection timeout'));
            }, 20000);
            
            const onStateChange = (_, newState) => {
              if (newState.status === 'ready') {
                clearTimeout(timeout);
                connection.off('stateChange', onStateChange);
                resolve();
              } else if (newState.status === 'disconnected' || newState.status === 'destroyed') {
                clearTimeout(timeout);
                connection.off('stateChange', onStateChange);
                reject(new Error('Voice connection failed'));
              }
            };
            
            connection.on('stateChange', onStateChange);
          });
        }
      } catch (error) {
        if (connection.state.status !== 'ready') {
          console.error('Voice connection failed:', error);
          throw error;
        }
      }
    }

    return connection;
  }

  async executeWithErrorHandling(interaction, operation) {
    await this.executeCommand(interaction, operation);
  }

  async handleMusicCommand(interaction, action) {
    await this.executeWithErrorHandling(interaction, async () => {
      const result = this.youtubeAPI[action](interaction.guildId);
      
      if (result.success) {
        const actionEmojis = {
          pause: '⏸️',
          resume: '▶️',
          skip: '⏭️',
          previous: '⏮️',
          stop: '⏹️'
        };
        
        const message = action === 'stop' ? 'Stopped playback and cleared queue' : result.message;
        await this.sendReply(interaction, `${actionEmojis[action] || '✅'} ${message}`);
        
        if (action === 'resume' || action === 'skip' || action === 'previous') {
          const current = this.youtubeAPI.getCurrentTrack(interaction.guildId);
          this.updatePresence(`🎵 ${current.track?.title || 'Playing'}`);
        } else if (action === 'pause') {
          this.updatePresence('⏸️ Paused');
        } else if (action === 'stop') {
          this.updatePresence('🎵 Ready to play music');
        }
      } else {
        await this.sendReply(interaction, `❌ ${result.message}`);
      }
    });
  }

  async handlePlay(interaction) {
    const query = sanitizeInput(interaction.options.getString('query'));
    
    if (!query) {
      await interaction.reply({ content: 'Please provide a valid song name or URL!', flags: 64 });
      return;
    }

    await this.executeCommand(interaction, async () => {
      if (!await this.validateVoiceChannel(interaction)) return;

      await this.sendReply(interaction, '🔍 Searching for your song...');

      const result = await this.youtubeAPI.play(interaction, query);
      
      if (result.success) {
        const emoji = result.addedToQueue ? '➕' : '🎵';
        await this.sendReply(interaction, `${emoji} ${result.message}\n**Channel:** ${result.track.channel}`);
        
        if (!result.addedToQueue) {
          this.updatePresence(`🎵 ${result.track.title}`);
        }
      } else {
        if (result.message.includes('Railway Hosting Limitation')) {
          await this.sendReply(interaction, result.message);
        } else if (result.message.includes('YouTube blocked access')) {
          await this.sendReply(interaction, `🚫 **YouTube Access Blocked**\n\n${result.message}\n\n💡 **Alternative Solutions:**\n• Try different search terms\n• Use specific song titles\n• Consider self-hosting on a VPS`);
        } else {
          await this.sendReply(interaction, `❌ ${result.message}`);
        }
      }
    });
  }

  async handlePause(interaction) {
    await this.handleMusicCommand(interaction, 'pause');
  }

  async handleResume(interaction) {
    await this.handleMusicCommand(interaction, 'resume');
  }

  async handleSkip(interaction) {
    await this.handleMusicCommand(interaction, 'skip');
  }

  async handlePrevious(interaction) {
    await this.handleMusicCommand(interaction, 'previous');
  }

  async handleVolume(interaction) {
    const level = interaction.options.getInteger('level');
    
    await this.executeWithErrorHandling(interaction, async () => {
      const result = this.youtubeAPI.setVolume(interaction.guildId, level);
      
      if (result.success) {
        await this.sendReply(interaction, `🔊 Volume set to ${result.volume}%`);
      } else {
        await this.sendReply(interaction, `❌ ${result.message}`);
      }
    });
  }

  async handleNowPlaying(interaction) {
    await this.executeWithErrorHandling(interaction, async () => {
      const current = this.youtubeAPI.getCurrentTrack(interaction.guildId);
      
      if (current.track) {
        const statusEmoji = current.isPlaying ? '🎵' : '⏸️';
        const repeatEmoji = current.repeatMode === 'track' ? '🔂' : current.repeatMode === 'queue' ? '🔁' : '';
        
        await this.sendReply(interaction, `${statusEmoji} **Now Playing**\n**${current.track.title}**\nby *${current.track.channel}*\n\n🔊 Volume: ${current.volume}%\n${repeatEmoji} Repeat: ${current.repeatMode}\n📋 Queue: ${current.queue} songs`);
      } else {
        await this.sendReply(interaction, '❌ No song is currently playing.');
      }
    });
  }

  async handleQueue(interaction) {
    await this.executeWithErrorHandling(interaction, async () => {
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
        
        await this.sendReply(interaction, message);
      } else {
        await this.sendReply(interaction, '❌ Queue is empty.');
      }
    });
  }

  async handleStop(interaction) {
    await this.handleMusicCommand(interaction, 'stop');
  }

  async handleJoin(interaction) {
    await this.executeCommand(interaction, async () => {
      if (!await this.validateVoiceChannel(interaction)) return;
      
      try {
        const connection = getVoiceConnection(interaction.guild.id);
        if (connection) {
          await this.sendReply(interaction, '✅ Already connected to voice channel!');
        } else {
          await this.sendReply(interaction, '✅ Use /play to join and start playing music!');
        }
      } catch {
        await this.sendReply(interaction, '❌ Failed to check voice connection status.');
      }
    });
  }

  async handleLeave(interaction) {
    await this.executeWithErrorHandling(interaction, async () => {
      const connection = getVoiceConnection(interaction.guild.id);
      if (connection) {
        this.youtubeAPI.stop(interaction.guildId);
        connection.destroy();
        await this.sendReply(interaction, '✅ Left voice channel!');
        this.updatePresence('🎵 Ready to play music');
      } else {
        await this.sendReply(interaction, '❌ Not connected to a voice channel.');
      }
    });
  }

  async handleDebug(interaction) {
    await this.executeWithErrorHandling(interaction, async () => {
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
      logger.info('Clearing all existing commands...');

      const route = process.env.NODE_ENV === 'production' || !process.env.DISCORD_GUILD_ID
        ? Routes.applicationCommands(process.env.DISCORD_CLIENT_ID)
        : Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID);

      await rest.put(route, { body: [] });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      logger.info('Registering fresh commands...');
      await rest.put(route, { body: this.commandsData });
      
      const scope = process.env.NODE_ENV === 'production' || !process.env.DISCORD_GUILD_ID ? 'globally' : `for guild ${process.env.DISCORD_GUILD_ID}`;
      logger.info(`Registered ${this.commandsData.length} commands ${scope}`);
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
