import {
  Client,
  GatewayIntentBits,
  ActivityType,
  SlashCommandBuilder,
  REST,
  Routes
} from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import dotenv from 'dotenv';
import YouTubeAPI from './youtube-api.js';
import { startWebServer } from './web-server.js';
import { createLogger, createValidator, ValidationRules, sanitizeInput } from './utils.js';
import type { Server } from 'node:http';

dotenv.config();

const logger = createLogger('DiscordBot');

type QueueMethod = 'pause' | 'resume' | 'stop' | 'skip' | 'previous';

class YouTubeMusicDiscordBot {
  client: Client;
  commands = new Map<string, SlashCommandBuilder>();
  commandsData: ReturnType<SlashCommandBuilder['toJSON']>[] = [];
  youtubeAPI: YouTubeAPI;
  commandHandlers: Record<string, (i: ChatInputCommandInteraction) => Promise<void>>;
  webServer: Server | null = null;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
      ]
    });

    this.youtubeAPI = new YouTubeAPI();
    this.commandHandlers = {
      play: this.handlePlay.bind(this),
      pause: this.handlePause.bind(this),
      resume: this.handleResume.bind(this),
      skip: this.handleSkip.bind(this),
      previous: this.handlePrevious.bind(this),
      volume: this.handleVolume.bind(this),
      nowplaying: this.handleNowPlaying.bind(this),
      queue: this.handleQueue.bind(this),
      stop: this.handleStop.bind(this),
      join: this.handleJoin.bind(this),
      leave: this.handleLeave.bind(this),
      debug: this.handleDebug.bind(this)
    };
    this.setupCommands();
    this.setupEvents();
  }

  setupCommands() {
    const commands: {
      name: string;
      description: string;
      options?: {
        name: string;
        description: string;
        type: 'STRING' | 'INTEGER';
        required?: boolean;
        minValue?: number;
        maxValue?: number;
      }[];
    }[] = [
      {
        name: 'play',
        description: 'Play a song in the voice channel',
        options: [
          {
            name: 'query',
            description: 'Song name or search query',
            type: 'STRING',
            required: true
          }
        ]
      },
      { name: 'pause', description: 'Pause the current song' },
      { name: 'resume', description: 'Resume playback' },
      { name: 'skip', description: 'Skip to the next song' },
      { name: 'previous', description: 'Go to the previous song' },
      {
        name: 'volume',
        description: 'Set the volume',
        options: [
          {
            name: 'level',
            description: 'Volume level (0-100)',
            type: 'INTEGER',
            required: true,
            minValue: 0,
            maxValue: 100
          }
        ]
      },
      { name: 'nowplaying', description: 'Show current song info' },
      { name: 'queue', description: 'Show the current queue' },
      { name: 'stop', description: 'Stop playback and clear queue' },
      { name: 'join', description: 'Join your voice channel' },
      { name: 'leave', description: 'Leave the voice channel' },
      { name: 'debug', description: 'Show bot system status' }
    ];

    this.commandsData = commands.map((cmd) => {
      const builder = new SlashCommandBuilder().setName(cmd.name).setDescription(cmd.description);

      if (cmd.options) {
        cmd.options.forEach((opt) => {
          if (opt.type === 'STRING') {
            builder.addStringOption((option) =>
              option
                .setName(opt.name)
                .setDescription(opt.description)
                .setRequired(opt.required || false)
            );
          } else if (opt.type === 'INTEGER') {
            builder.addIntegerOption((option) => {
              const intOption = option
                .setName(opt.name)
                .setDescription(opt.description)
                .setRequired(opt.required || false);
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
      const user = this.client.user;
      if (!user) return;

      logger.info(`Logged in as ${user.tag}; guilds: ${this.client.guilds.cache.size}`);

      try {
        await this.youtubeAPI.initializeDistube(this.client);
        logger.info('DisTube ready');
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('DisTube init failed:', msg);
        setTimeout(async () => {
          try {
            await this.youtubeAPI.initializeDistube(this.client);
            logger.info('DisTube ready (retry)');
          } catch (retryError) {
            const r = retryError instanceof Error ? retryError.message : String(retryError);
            logger.error('DisTube retry failed:', r);
          }
        }, 5000);
      }

      this.updatePresence('Idle');
    });

    this.client.on('error', (error) => {
      logger.error('Discord error:', error.message);
    });

    this.client.on('guildCreate', (guild) => {
      logger.info(`Joined guild ${guild.name} (${guild.id}); total ${this.client.guilds.cache.size}`);
    });

    this.client.on('guildDelete', (guild) => {
      logger.info(`Left guild ${guild.name} (${guild.id}); total ${this.client.guilds.cache.size}`);
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = interaction.commandName;
      logger.info(`Command: ${command} from ${interaction.user.tag} in ${interaction.guild?.name || 'DM'}`);

      if (!interaction.guild) {
        try {
          await interaction.reply({ content: 'Commands only work in servers.', flags: 64 });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error('Failed to respond to DM interaction:', msg);
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

  async handleInteractionError(
    interaction: ChatInputCommandInteraction,
    error: unknown,
    commandName: string
  ) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Error handling command ${commandName}:`, errMsg);

    try {
      const errorMessage = 'Command failed.';

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: errorMessage, flags: 64 });
      } else if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.followUp({ content: errorMessage, flags: 64 });
      }
    } catch (replyError) {
      const msg = replyError instanceof Error ? replyError.message : String(replyError);
      logger.error('Failed to send error response:', msg);
    }
  }

  async validateVoiceChannel(interaction: ChatInputCommandInteraction) {
    const member = interaction.member;
    if (!member || !('voice' in member) || !member.voice.channel) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Join a voice channel first.', flags: 64 });
      } else {
        await interaction.editReply({ content: 'Join a voice channel first.' });
      }
      return false;
    }
    return true;
  }

  async handleCommand(interaction: ChatInputCommandInteraction) {
    const command = interaction.commandName;
    const handler = this.commandHandlers[command];
    if (handler) {
      await handler(interaction);
    } else {
      await interaction.reply({ content: 'Unknown command!', flags: 64 });
    }
  }

  async executeQueueCommand(
    interaction: ChatInputCommandInteraction,
    action: QueueMethod,
    successMessage: string,
    onSuccess: (() => void) | null = null
  ) {
    await interaction.deferReply();

    const fn = this.youtubeAPI[action].bind(this.youtubeAPI) as (g: string | null) => {
      success: boolean;
      message: string;
    };
    const result = fn(interaction.guildId);

    if (!result.success) {
      await interaction.editReply(result.message);
      return;
    }

    await interaction.editReply(successMessage);
    if (onSuccess) {
      onSuccess();
    }
  }

  async handlePlay(interaction: ChatInputCommandInteraction) {
    const query = sanitizeInput(interaction.options.getString('query'));

    if (!query) {
      await interaction.reply({ content: 'Enter a song name or URL.', flags: 64 });
      return;
    }

    if (!(await this.validateVoiceChannel(interaction))) return;

    await interaction.deferReply();

    try {
      const result = await this.youtubeAPI.play(interaction, query);

      if (result.success && result.track) {
        await interaction.editReply(`${result.message}\n**Channel:** ${result.track.channel}`);

        if (!result.addedToQueue) {
          this.updatePresence(result.track.title);
        }
      } else {
        await interaction.editReply(result.message);
      }
    } catch (error) {
      logger.error('Error in play command:', error);
      try {
        await interaction.editReply('Playback error.');
      } catch (editError) {
        const msg = editError instanceof Error ? editError.message : String(editError);
        logger.error('Failed to edit reply:', msg);
      }
    }
  }

  async handlePause(interaction: ChatInputCommandInteraction) {
    await this.executeQueueCommand(interaction, 'pause', 'Paused.', () => this.updatePresence('Paused'));
  }

  async handleResume(interaction: ChatInputCommandInteraction) {
    await this.executeQueueCommand(interaction, 'resume', 'Resumed.', () => {
      const current = this.youtubeAPI.getCurrentTrack(interaction.guildId);
      this.updatePresence(current.track?.title || 'Playing');
    });
  }

  async handleSkip(interaction: ChatInputCommandInteraction) {
    await this.executeQueueCommand(interaction, 'skip', 'Skipped.', () => {
      const current = this.youtubeAPI.getCurrentTrack(interaction.guildId);
      this.updatePresence(current.track?.title || 'Playing');
    });
  }

  async handlePrevious(interaction: ChatInputCommandInteraction) {
    await this.executeQueueCommand(interaction, 'previous', 'Previous track.', () => {
      const current = this.youtubeAPI.getCurrentTrack(interaction.guildId);
      this.updatePresence(current.track?.title || 'Playing');
    });
  }

  async handleVolume(interaction: ChatInputCommandInteraction) {
    const level = interaction.options.getInteger('level');
    if (level === null) {
      await interaction.reply({ content: 'Missing volume level.', flags: 64 });
      return;
    }

    await interaction.deferReply();

    const result = this.youtubeAPI.setVolume(interaction.guildId, level);

    if ('volume' in result && result.success) {
      await interaction.editReply(`Volume: ${result.volume}%`);
    } else if (!result.success && 'message' in result) {
      await interaction.editReply(result.message);
    }
  }

  async handleNowPlaying(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const current = this.youtubeAPI.getCurrentTrack(interaction.guildId);

    if (current.track) {
      const state = current.isPlaying ? 'Playing' : 'Paused';
      await interaction.editReply(
        `**${state}:** ${current.track.title}\n*${current.track.channel}*\n\n` +
          `Volume: ${current.volume}%\nRepeat: ${current.repeatMode}\nQueue: ${current.queue} track(s)`
      );
    } else {
      await interaction.editReply('Nothing playing.');
    }
  }

  async handleQueue(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const queueInfo = this.youtubeAPI.getQueue(interaction.guildId);

    if (queueInfo.current) {
      let message = `**Now:** ${queueInfo.current.title} — *${queueInfo.current.channel}*\n\n`;

      if (queueInfo.queue.length > 0) {
        message += `**Up next (${queueInfo.queue.length}):**\n`;
        queueInfo.queue.slice(0, 10).forEach((track, index) => {
          message += `${index + 1}. ${track.title} — *${track.channel}*\n`;
        });

        if (queueInfo.queue.length > 10) {
          message += `…and ${queueInfo.queue.length - 10} more`;
        }
      } else {
        message += 'Queue empty.';
      }

      await interaction.editReply(message);
    } else {
      await interaction.editReply('Queue empty.');
    }
  }

  async handleStop(interaction: ChatInputCommandInteraction) {
    await this.executeQueueCommand(interaction, 'stop', 'Stopped; queue cleared.', () =>
      this.updatePresence('Idle')
    );
  }

  async handleJoin(interaction: ChatInputCommandInteraction) {
    if (!(await this.validateVoiceChannel(interaction))) return;

    await interaction.deferReply();

    const guildId = interaction.guild?.id;
    if (!guildId) return;
    const connection = getVoiceConnection(guildId);
    if (connection) {
      await interaction.editReply('Already in voice.');
    } else {
      await interaction.editReply('Use /play to connect and start playback.');
    }
  }

  async handleLeave(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const guildId = interaction.guild?.id;
    if (!guildId) return;
    const connection = getVoiceConnection(guildId);
    if (connection) {
      this.youtubeAPI.stop(interaction.guildId);
      connection.destroy();
      await interaction.editReply('Left voice channel.');
      this.updatePresence('Idle');
    } else {
      await interaction.editReply('Not in a voice channel.');
    }
  }

  async handleDebug(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const distubeStatus = this.youtubeAPI.distube ? 'ok' : 'missing';
    const nodeVersion = process.version;
    const uptime = Math.floor(process.uptime());
    const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

    await interaction.editReply({
      content:
        '**Debug**\n' +
        `DisTube: ${distubeStatus}\n` +
        `Node: ${nodeVersion}\n` +
        `Uptime: ${uptime}s\n` +
        `Heap: ${memory} MB\n` +
        `NODE_ENV: ${process.env.NODE_ENV || 'development'}\n` +
        `Guilds: ${this.client.guilds.cache.size}`
    });
  }

  updatePresence(activity: string) {
    const user = this.client.user;
    if (!user) return;
    user.setPresence({
      activities: [{ name: activity, type: ActivityType.Listening }],
      status: 'online'
    });
  }

  async registerCommands() {
    const token = process.env.DISCORD_BOT_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!token || !clientId) {
      throw new Error('Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID');
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
      const globalRoute = Routes.applicationCommands(clientId);

      if (process.env.DISCORD_GUILD_ID) {
        const guildRoute = Routes.applicationGuildCommands(clientId, process.env.DISCORD_GUILD_ID);
        await rest.put(guildRoute, { body: this.commandsData });
        logger.info(
          `Slash commands registered (guild ${process.env.DISCORD_GUILD_ID}), ${this.commandsData.length} total`
        );
      } else {
        await rest.put(globalRoute, { body: this.commandsData });
        logger.info(`Slash commands registered (global), ${this.commandsData.length} total`);
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

    const skipWeb =
      process.env.SKIP_WEB_SERVER === '1' || process.env.SKIP_WEB_SERVER === 'true';
    if (!skipWeb) {
      const { server: webServer } = await startWebServer({
        logger: (msg) => logger.info(msg)
      });
      this.webServer = webServer;
    } else {
      logger.info('SKIP_WEB_SERVER: static HTTP disabled');
    }

    await this.client.login(process.env.DISCORD_BOT_TOKEN);
  }
}

const bot = new YouTubeMusicDiscordBot();

let shuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info(`Received ${signal}, shutting down...`);

  try {
    if (bot.webServer) {
      bot.webServer.closeAllConnections?.();
      await new Promise<void>((resolve, reject) => {
        bot.webServer!.close((err) => (err ? reject(err) : resolve()));
      });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Error closing web server:', msg);
  }

  try {
    bot.client.destroy();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Error destroying Discord client:', msg);
  }

  process.exit(0);
}

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

bot.start().catch((error) => {
  logger.error('Failed to start bot:', error);
  process.exit(1);
});
