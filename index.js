import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ActivityType } from 'discord.js';
import dotenv from 'dotenv';
import { createLogger, createAsyncDebouncer, createValidator, ValidationRules, sanitizeInput } from './utils.js';

dotenv.config();

const logger = createLogger('DiscordBot');

class YouTubeMusicDiscordBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
      ]
    });

    this.commands = new Map();
    this.setupCommands();
    this.setupEvents();
  }

  setupCommands() {
    const commands = [
      new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song')
        .addStringOption(option =>
          option.setName('query')
            .setDescription('Song name or YouTube URL')
            .setRequired(true)
        ),
      
      new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song'),
      
      new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume playback'),
      
      new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip to the next song'),
      
      new SlashCommandBuilder()
        .setName('previous')
        .setDescription('Go to the previous song'),
      
      new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set the volume')
        .addIntegerOption(option =>
          option.setName('level')
            .setDescription('Volume level (0-100)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(100)
        ),
      
      new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show current song info'),
      
      new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current queue'),
      
      new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playback and clear queue')
    ];

    // Store commands
    commands.forEach(command => {
      this.commands.set(command.name, command);
    });

    this.commandsData = commands.map(command => command.toJSON());
  }

  setupEvents() {
    this.client.once('ready', () => {
      logger.info(`Bot is ready! Logged in as ${this.client.user.tag}`);
      this.updatePresence('🎵 Ready to play music');
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = interaction.commandName;
      logger.info(`Received command: ${command}`);

      try {
        await this.handleCommand(interaction);
      } catch (error) {
        logger.error(`Error handling command ${command}:`, error);
        
        const errorMessage = 'There was an error executing this command!';
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      }
    });
  }

  async handleCommand(interaction) {
    const command = interaction.commandName;

    switch (command) {
      case 'play':
        await this.handlePlay(interaction);
        break;
      case 'pause':
        await this.handlePause(interaction);
        break;
      case 'resume':
        await this.handleResume(interaction);
        break;
      case 'skip':
        await this.handleSkip(interaction);
        break;
      case 'previous':
        await this.handlePrevious(interaction);
        break;
      case 'volume':
        await this.handleVolume(interaction);
        break;
      case 'nowplaying':
        await this.handleNowPlaying(interaction);
        break;
      case 'queue':
        await this.handleQueue(interaction);
        break;
      case 'stop':
        await this.handleStop(interaction);
        break;
      default:
        await interaction.reply({ content: 'Unknown command!', ephemeral: true });
    }
  }

  async handlePlay(interaction) {
    const query = sanitizeInput(interaction.options.getString('query'));
    
    if (!query) {
      await interaction.reply({ content: 'Please provide a valid song name or URL!', ephemeral: true });
      return;
    }

    await interaction.deferReply();
    
    // Simulate playing music (replace with actual YouTube Music integration)
    logger.info(`Playing: ${query}`);
    
    await interaction.editReply({
      content: `🎵 Now playing: **${query}**`
    });

    this.updatePresence(`🎵 ${query}`);
  }

  async handlePause(interaction) {
    await interaction.reply('⏸️ Paused playback');
    this.updatePresence('⏸️ Paused');
    logger.info('Paused playback');
  }

  async handleResume(interaction) {
    await interaction.reply('▶️ Resumed playback');
    this.updatePresence('▶️ Playing');
    logger.info('Resumed playback');
  }

  async handleSkip(interaction) {
    await interaction.reply('⏭️ Skipped to next song');
    this.updatePresence('⏭️ Skipped');
    logger.info('Skipped to next song');
  }

  async handlePrevious(interaction) {
    await interaction.reply('⏮️ Going to previous song');
    this.updatePresence('⏮️ Previous');
    logger.info('Going to previous song');
  }

  async handleVolume(interaction) {
    const level = interaction.options.getInteger('level');
    
    const validator = createValidator({
      level: { ...ValidationRules.required, ...ValidationRules.volume }
    });

    const validation = validator({ level });
    
    if (!validation.valid) {
      await interaction.reply({ 
        content: `Invalid volume level: ${validation.errors.join(', ')}`, 
        ephemeral: true 
      });
      return;
    }

    await interaction.reply(`🔊 Volume set to ${level}%`);
    logger.info(`Volume set to ${level}%`);
  }

  async handleNowPlaying(interaction) {
    // Simulate current song info (replace with actual YouTube Music integration)
    const currentSong = {
      title: 'Sample Song',
      artist: 'Sample Artist',
      duration: '3:45',
      position: '1:23'
    };

    await interaction.reply({
      content: `🎵 **Now Playing:**\n**${currentSong.title}** by *${currentSong.artist}*\n⏱️ ${currentSong.position} / ${currentSong.duration}`
    });
  }

  async handleQueue(interaction) {
    // Simulate queue (replace with actual YouTube Music integration)
    const queue = [
      'Song 1 - Artist 1',
      'Song 2 - Artist 2',
      'Song 3 - Artist 3'
    ];

    const queueText = queue.length > 0 
      ? queue.map((song, index) => `${index + 1}. ${song}`).join('\n')
      : 'Queue is empty';

    await interaction.reply({
      content: `📋 **Queue:**\n${queueText}`
    });
  }

  async handleStop(interaction) {
    await interaction.reply('⏹️ Stopped playback and cleared queue');
    this.updatePresence('⏹️ Stopped');
    logger.info('Stopped playback and cleared queue');
  }

  updatePresence(activity) {
    this.client.user.setActivity(activity, { type: ActivityType.Playing });
  }

  async registerCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

    try {
      logger.info('Registering slash commands...');

      if (process.env.DISCORD_GUILD_ID) {
        // Register commands for a specific guild (faster for development)
        await rest.put(
          Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
          { body: this.commandsData }
        );
        logger.info('Successfully registered guild commands');
      } else {
        // Register commands globally (takes up to 1 hour to propagate)
        await rest.put(
          Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
          { body: this.commandsData }
        );
        logger.info('Successfully registered global commands');
      }
    } catch (error) {
      logger.error('Error registering commands:', error);
    }
  }

  async start() {
    // Validate environment variables
    const validator = createValidator({
      DISCORD_BOT_TOKEN: { ...ValidationRules.required, ...ValidationRules.string },
      DISCORD_CLIENT_ID: { ...ValidationRules.required, ...ValidationRules.string }
    });

    const validation = validator({
      DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
      DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID
    });

    if (!validation.valid) {
      logger.error('Invalid environment configuration:', validation.errors);
      process.exit(1);
    }

    await this.registerCommands();
    await this.client.login(process.env.DISCORD_BOT_TOKEN);
  }
}

// Start the bot
const bot = new YouTubeMusicDiscordBot();
bot.start().catch(error => {
  logger.error('Failed to start bot:', error);
  process.exit(1);
});
