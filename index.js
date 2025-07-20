import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ActivityType } from 'discord.js';
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
      { name: 'play', description: 'Play a song in the voice channel', options: [{ name: 'query', description: 'Song name or search query', type: 'STRING', required: true }] },
      { name: 'pause', description: 'Pause the current song' },
      { name: 'resume', description: 'Resume playback' },
      { name: 'skip', description: 'Skip to the next song' },
      { name: 'previous', description: 'Go to the previous song' },
      { name: 'volume', description: 'Set the volume', options: [{ name: 'level', description: 'Volume level (0-100)', type: 'INTEGER', required: true, minValue: 0, maxValue: 100 }] },
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
      
      logger.info('Waiting 3 seconds before DisTube initialization...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      try {
        logger.info('Starting DisTube initialization...');
        await this.youtubeAPI.initializeDistube(this.client);
        logger.info('✅ DisTube initialization completed successfully');
      } catch (error) {
        logger.error('❌ DisTube initialization failed:', error);
        logger.error('Error details:', error.stack);
        
        logger.info('Attempting DisTube retry in 5 seconds...');
        setTimeout(async () => {
          try {
            await this.youtubeAPI.initializeDistube(this.client);
            logger.info('✅ DisTube retry successful');
          } catch (retryError) {
            logger.error('❌ DisTube retry failed:', retryError);
          }
        }, 5000);
      }
      
      this.updatePresence('🎵 Ready to play music');
    });

    this.client.on('error', (error) => {
      logger.error('Discord error:', error);
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
      logger.info(`Received command: ${command} from user: ${interaction.user.tag} in guild: ${interaction.guild?.name || 'DM'}`);

      try {
        await this.handleCommand(interaction);
      } catch (error) {
        logger.error(`Error handling command ${command}:`, error);
        await this.sendErrorResponse(interaction, 'There was an error executing this command!');
      }
    });
  }

  async sendErrorResponse(interaction, message) {
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: message, ephemeral: true });
      } else {
        await interaction.reply({ content: message, ephemeral: true });
      }
    } catch (interactionError) {
      logger.error('Failed to send error message to user:', interactionError);
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
      await interaction.reply({ content: 'Unknown command!', ephemeral: true });
    }
  }

  async getVoiceConnection(interaction) {
    const member = interaction.member;
    const voiceChannel = member?.voice?.channel;
    
    if (!voiceChannel) {
      await interaction.editReply({ content: '❌ You need to be in a voice channel to use this command!' });
      return null;
    }

    let connection = getVoiceConnection(interaction.guild.id);
    
    if (!connection) {
      console.log('Creating new voice connection for guild:', interaction.guild.id);
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });
      
      connection.on('stateChange', (oldState, newState) => {
        console.log(`Voice connection state changed: ${oldState.status} -> ${newState.status}`);
        if (newState.status === 'disconnected') {
          console.log('Voice connection disconnected, destroying...');
          connection.destroy();
        }
      });

      connection.on('error', (error) => {
        console.error('Voice connection error:', error);
      });

      try {
        console.log('Waiting for voice connection to be ready...');
        
        if (connection.state.status !== 'ready') {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Connection timeout'));
            }, 20000);
            
            const onStateChange = (_, newState) => {
              console.log('Voice connection state changed to:', newState.status);
              if (newState.status === 'ready') {
                console.log('Voice connection is now ready');
                clearTimeout(timeout);
                connection.off('stateChange', onStateChange);
                resolve();
              } else if (newState.status === 'disconnected' || newState.status === 'destroyed') {
                console.log('Voice connection failed');
                clearTimeout(timeout);
                connection.off('stateChange', onStateChange);
                reject(new Error('Voice connection failed'));
              }
            };
            
            connection.on('stateChange', onStateChange);
          });
        } else {
          console.log('Voice connection already ready');
        }
        
        console.log('Voice connection established successfully');
      } catch (error) {
        if (connection.state.status === 'ready') {
          console.log('Voice connection is actually ready despite error');
        } else {
          console.error('Voice connection failed:', error);
          throw error;
        }
      }
    } else {
      console.log('Using existing voice connection for guild:', interaction.guild.id);
    }

    return connection;
  }

  async executeWithErrorHandling(interaction, operation) {
    await interaction.deferReply();
    
    try {
      await operation();
    } catch (error) {
      logger.error(`Error in ${interaction.commandName}:`, error);
      await interaction.editReply({ content: `❌ An error occurred while ${interaction.commandName === 'play' ? 'playing' : 'executing'} the command.` });
    }
  }

  async handlePlay(interaction) {
    const query = sanitizeInput(interaction.options.getString('query'));
    
    if (!query) {
      await interaction.reply({ content: 'Please provide a valid song name or URL!', ephemeral: true });
      return;
    }

    await this.executeWithErrorHandling(interaction, async () => {
      if (!interaction.member.voice.channel) {
        await interaction.editReply({ content: '❌ You must be in a voice channel to play music!' });
        return;
      }

      await interaction.editReply({ content: '🔍 Searching for your song...' });

      const result = await this.youtubeAPI.play(interaction, query);
      
      if (result.success) {
        const emoji = result.addedToQueue ? '➕' : '🎵';
        await interaction.editReply({
          content: `${emoji} ${result.message}\n**Channel:** ${result.track.channel}`
        });
        
        if (!result.addedToQueue) {
          this.updatePresence(`🎵 ${result.track.title}`);
        }
      } else {
        await interaction.editReply({
          content: `❌ ${result.message}`
        });
      }
    });
  }

  async handlePause(interaction) {
    await this.executeWithErrorHandling(interaction, async () => {
      const result = this.youtubeAPI.pause(interaction.guildId);
      
      if (result.success) {
        await interaction.editReply({ content: '⏸️ Paused' });
        this.updatePresence('⏸️ Paused');
      } else {
        await interaction.editReply({ content: `❌ ${result.message}` });
      }
    });
  }

  async handleResume(interaction) {
    await this.executeWithErrorHandling(interaction, async () => {
      const result = this.youtubeAPI.resume(interaction.guildId);
      
      if (result.success) {
        await interaction.editReply({ content: '▶️ Resumed' });
        const current = this.youtubeAPI.getCurrentTrack(interaction.guildId);
        this.updatePresence(`🎵 ${current.track?.title || 'Playing'}`);
      } else {
        await interaction.editReply({ content: `❌ ${result.message}` });
      }
    });
  }

  async handleSkip(interaction) {
    await this.executeWithErrorHandling(interaction, async () => {
      const result = this.youtubeAPI.skip(interaction.guildId);
      
      if (result.success) {
        await interaction.editReply({ content: `⏭️ ${result.message}` });
        const current = this.youtubeAPI.getCurrentTrack(interaction.guildId);
        this.updatePresence(`🎵 ${current.track?.title || 'Playing'}`);
      } else {
        await interaction.editReply({ content: `❌ ${result.message}` });
      }
    });
  }

  async handlePrevious(interaction) {
    await this.executeWithErrorHandling(interaction, async () => {
      const result = this.youtubeAPI.previous(interaction.guildId);
      
      if (result.success) {
        await interaction.editReply({ content: `⏮️ ${result.message}` });
        const current = this.youtubeAPI.getCurrentTrack(interaction.guildId);
        this.updatePresence(`🎵 ${current.track?.title || 'Playing'}`);
      } else {
        await interaction.editReply({ content: `❌ ${result.message}` });
      }
    });
  }

  async handleVolume(interaction) {
    const level = interaction.options.getInteger('level');
    
    await this.executeWithErrorHandling(interaction, async () => {
      const result = this.youtubeAPI.setVolume(interaction.guildId, level);
      
      if (result.success) {
        await interaction.editReply({ content: `🔊 Volume set to ${result.volume}%` });
      } else {
        await interaction.editReply({ content: `❌ ${result.message}` });
      }
    });
  }

  async handleNowPlaying(interaction) {
    await this.executeWithErrorHandling(interaction, async () => {
      const current = this.youtubeAPI.getCurrentTrack(interaction.guildId);
      
      if (current.track) {
        const statusEmoji = current.isPlaying ? '🎵' : '⏸️';
        const repeatEmoji = current.repeatMode === 'track' ? '🔂' : current.repeatMode === 'queue' ? '🔁' : '';
        
        await interaction.editReply({
          content: `${statusEmoji} **Now Playing**\n**${current.track.title}**\nby *${current.track.channel}*\n\n🔊 Volume: ${current.volume}%\n${repeatEmoji} Repeat: ${current.repeatMode}\n📋 Queue: ${current.queue} songs`
        });
      } else {
        await interaction.editReply({ content: '❌ No song is currently playing.' });
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
        
        await interaction.editReply({ content: message });
      } else {
        await interaction.editReply({ content: '❌ Queue is empty.' });
      }
    });
  }

  async handleStop(interaction) {
    await this.executeWithErrorHandling(interaction, async () => {
      const result = this.youtubeAPI.stop(interaction.guildId);
      
      if (result.success) {
        await interaction.editReply({ content: '⏹️ Stopped playback and cleared queue' });
        this.updatePresence('🎵 Ready to play music');
      } else {
        await interaction.editReply({ content: `❌ ${result.message}` });
      }
    });
  }

  async handleJoin(interaction) {
    await this.executeWithErrorHandling(interaction, async () => {
      if (!interaction.member.voice.channel) {
        await interaction.editReply({ content: '❌ You need to be in a voice channel!' });
        return;
      }
      
      try {
        const connection = getVoiceConnection(interaction.guild.id);
        if (connection) {
          await interaction.editReply({ content: '✅ Already connected to voice channel!' });
        } else {
          await interaction.editReply({ content: '✅ Use /play to join and start playing music!' });
        }
      } catch {
        await interaction.editReply({ content: '❌ Failed to check voice connection status.' });
      }
    });
  }

  async handleLeave(interaction) {
    await this.executeWithErrorHandling(interaction, async () => {
      const connection = getVoiceConnection(interaction.guild.id);
      if (connection) {
        this.youtubeAPI.stop(interaction.guildId);
        connection.destroy();
        await interaction.editReply({ content: '✅ Left voice channel!' });
        this.updatePresence('🎵 Ready to play music');
      } else {
        await interaction.editReply({ content: '❌ Not connected to a voice channel.' });
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
      logger.info('Registering commands...');

      const route = process.env.NODE_ENV === 'production' || !process.env.DISCORD_GUILD_ID
        ? Routes.applicationCommands(process.env.DISCORD_CLIENT_ID)
        : Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID);

      await rest.put(route, { body: [] });
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
