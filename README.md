# Discord Bot for YouTube Music Control

A clean, minimal Discord bot with slash commands for music control. Built with modern JavaScript and essential utilities.

## 📁 Project Structure

```
discord-bot/
├── package.json          # Package configuration
├── .env.example          # Environment template
├── eslint.config.js      # ESLint configuration
├── utils.js              # Essential utilities
├── index.js              # Main bot logic
└── README.md             # This file
```

## 🚀 Quick Start

### 1. Setup Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token
5. Go to "OAuth2" → "General" and copy the Client ID
6. Go to "OAuth2" → "URL Generator":
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Use Slash Commands`
   - Copy the generated URL and invite the bot to your server

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```bash
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here_optional
```

### 4. Start the Bot

```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## 🎵 Available Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/play` | Play a song | `/play query:Song Name or URL` |
| `/pause` | Pause current song | `/pause` |
| `/resume` | Resume playback | `/resume` |
| `/skip` | Skip to next song | `/skip` |
| `/previous` | Go to previous song | `/previous` |
| `/volume` | Set volume (0-100) | `/volume level:50` |
| `/nowplaying` | Show current song info | `/nowplaying` |
| `/queue` | Show current queue | `/queue` |
| `/stop` | Stop and clear queue | `/stop` |

## 📋 File Details

### `package.json`
- **Dependencies**: `discord.js`, `dotenv`
- **Scripts**: `start`, `dev`, `lint`, `lint:fix`
- **Engine**: Node.js 18+

### `.env.example`
Environment template with required variables:
- `DISCORD_BOT_TOKEN` - Bot token from Discord Developer Portal
- `DISCORD_CLIENT_ID` - Application Client ID
- `DISCORD_GUILD_ID` - Optional guild ID for faster command registration

### `eslint.config.js`
Modern ESLint configuration:
- ES2022 module support
- Standard JavaScript rules
- Error handling for quotes, semicolons, indentation
- Disabled console warnings for bot logging

### `utils.js`
Essential utilities for the bot:

#### `createLogger(name)`
Creates a logger instance with consistent formatting:
```javascript
const logger = createLogger('BotName');
logger.info('Bot started');
logger.error('Error occurred');
```

#### `createAsyncDebouncer(fn, delay)`
Creates a debounced version of an async function:
```javascript
const debouncedFunction = createAsyncDebouncer(myFunction, 300);
```

#### `createValidator(schema)`
Creates a validator function for data validation:
```javascript
const validator = createValidator({
  name: { required: true, type: 'string' },
  age: { type: 'number', min: 0, max: 120 }
});
```

#### `ValidationRules`
Pre-defined validation rules:
- `required` - Field is required
- `string` - Must be string type
- `number` - Must be number type
- `boolean` - Must be boolean type
- `volume` - Number between 0-100

#### `sanitizeInput(input)`
Sanitizes user input by removing dangerous characters:
```javascript
const clean = sanitizeInput(userInput);
```

### `index.js`
Main bot implementation:

#### `YouTubeMusicDiscordBot` Class
- **Constructor**: Sets up Discord client and intents
- **setupCommands()**: Defines all slash commands
- **setupEvents()**: Handles Discord events
- **handleCommand()**: Routes commands to appropriate handlers
- **Command Handlers**: Individual methods for each command
- **registerCommands()**: Registers slash commands with Discord
- **start()**: Validates environment and starts the bot

#### Key Features
- **Error Handling**: Comprehensive error handling with logging
- **Input Validation**: All user inputs are validated and sanitized
- **Activity Status**: Bot status updates with current activity
- **Environment Validation**: Checks required environment variables on startup
- **Guild/Global Commands**: Supports both guild-specific and global command registration

## 🔧 Development

### Code Quality
```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix
```

### Adding New Commands

1. Add command definition in `setupCommands()`:
```javascript
new SlashCommandBuilder()
  .setName('mycommand')
  .setDescription('My command description')
```

2. Add case in `handleCommand()`:
```javascript
case 'mycommand':
  await this.handleMyCommand(interaction);
  break;
```

3. Implement handler method:
```javascript
async handleMyCommand(interaction) {
  await interaction.reply('Command executed!');
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_BOT_TOKEN` | Yes | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Yes | Application Client ID |
| `DISCORD_GUILD_ID` | No | Guild ID for faster command registration (dev) |

## 🎯 Integration Notes

The bot currently includes placeholder implementations for music functionality. To integrate with actual music services:

1. **Replace simulation code** in command handlers
2. **Add music service API** integration
3. **Update command responses** with real data
4. **Add music state management** for queue, current song, etc.

## 📊 Technical Specs

- **Language**: JavaScript (ES2022)
- **Runtime**: Node.js 18+
- **Dependencies**: 2 production, 1 development
- **Files**: 5 total
- **Lines of Code**: 438 total
- **Commands**: 9 slash commands
- **Utilities**: 5 helper functions

## 🛠️ Troubleshooting

### Bot Not Responding
1. Check bot token is correct
2. Verify bot has proper permissions
3. Ensure bot is invited to server
4. Check console for error messages

### Commands Not Showing
1. Wait up to 1 hour for global commands
2. Use `DISCORD_GUILD_ID` for faster registration
3. Check client ID is correct
4. Verify bot has `applications.commands` scope

### Environment Issues
1. Ensure `.env` file exists
2. Check all required variables are set
3. Verify no extra spaces in values
4. Restart bot after changes

## 📝 License

MIT License - Feel free to use and modify as needed.
