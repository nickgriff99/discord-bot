import { google } from 'googleapis';
import { DisTube } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';
import ffmpegStatic from 'ffmpeg-static';
import { createLogger } from './utils.js';

const logger = createLogger('YouTubeAPI');

class YouTubeAPI {
  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });
    
    this.distube = null;
    this.volume = 50;
    this.repeatMode = 'none';
  }

  createResponse(success, message, data = {}) {
    return { success, message, ...data };
  }

  createEmptyTrackResponse() {
    return { 
      track: null, 
      isPlaying: false, 
      queue: 0, 
      volume: this.volume, 
      repeatMode: this.repeatMode 
    };
  }

  createEmptyQueueResponse() {
    return { current: null, queue: [], length: 0 };
  }

  async initializeDistube(client) {
    if (!this.distube) {
      try {
        const ffmpegPath = ffmpegStatic || 'ffmpeg';
        if (typeof ffmpegPath === 'string' && ffmpegPath !== 'ffmpeg') {
          const fs = await import('fs');
          try {
            fs.accessSync(ffmpegPath, fs.constants.F_OK);
          } catch (error) {
            logger.warn('ffmpeg path not readable:', error.message);
          }
        }

        process.env.FFMPEG_PATH = ffmpegPath;

        const ytDlpOptions = {
          ffmpegPath: ffmpegPath,
          update: false,
          quality: 'highestaudio',
          extractorArgs: {
            'youtube': [
              '--no-check-certificate',
              '--prefer-free-formats',
              '--no-playlist',
              '--extract-flat', 'false',
              '--socket-timeout', '30',
              '--retries', '3'
            ]
          }
        };

        if (process.env.NODE_ENV === 'production') {
          this.distube = new DisTube(client, {
            ffmpeg: { path: ffmpegPath }
          });
        } else {
          this.distube = new DisTube(client, {
            plugins: [new YtDlpPlugin(ytDlpOptions)],
            ffmpeg: { path: ffmpegPath }
          });
        }

        this.setupDisTubeEvents();
      } catch (error) {
        logger.error('DisTube init failed:', error.message);
        this.distube = null;
        throw error;
      }
    }
  }

  setupDisTubeEvents() {
    this.distube.on('playSong', (queue, song) => {
      logger.info(`Playing: ${song.name}`);
    });

    this.distube.on('addSong', (queue, song) => {
      logger.info(`Queued: ${song.name}`);
    });

    this.distube.on('finish', (queue) => {
      logger.info(`Queue empty, guild ${queue.id}`);
    });

    this.distube.on('finishSong', (queue, song) => {
      const playbackDuration = queue.voice?.audioResource?.playbackDuration;
      if (!playbackDuration || playbackDuration < 5000) {
        logger.warn(`Short playback (${playbackDuration ?? 0}ms): ${song.name}`);
      }
    });

    this.distube.on('error', (channel, error) => {
      logger.error('DisTube:', error.message);
      if (channel) {
        channel.send(`Playback error: ${error.message}`).catch(() => {});
      }
    });

    this.distube.on('disconnect', (queue) => {
      logger.info(`Voice disconnected, guild ${queue.id}`);
    });

    this.distube.on('empty', (queue) => {
      logger.info(`Voice channel empty, guild ${queue.id}`);
    });

    this.distube.on('initQueue', (queue) => {
      queue.volume = this.volume;
    });

    this.distube.on('debug', (message) => {
      logger.debug('DisTube:', message);
    });
  }

  async searchYouTube(query) {
    try {
      const response = await Promise.race([
        this.youtube.search.list({
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: 5,
          videoCategoryId: '10',
          order: 'relevance',
          safeSearch: 'none',
          videoEmbeddable: 'true',
          videoSyndicated: 'true',
          videoDuration: 'any',
          fields: 'items(id/videoId,snippet(title,channelTitle))'
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Search timeout')), 10000)
        )
      ]);

      if (!response.data.items?.length) {
        return null;
      }

      const item = response.data.items[0];
      return {
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      };
    } catch (error) {
      logger.error('YouTube search error:', error.message);
      return null;
    }
  }

  async play(interaction, query = null) {
    try {
      if (!this.distube) {
        if (interaction?.client) {
          await this.initializeDistube(interaction.client);
          if (!this.distube) {
            return this.createResponse(false, 'Music backend failed to start. Try again.');
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          return this.createResponse(false, 'Music backend not ready.');
        }
      }

      if (!query) {
        return this.createResponse(false, 'No track to play');
      }

      return await this.playTrack(interaction, query);
    } catch (error) {
      logger.error('Play error:', error.message);
      return this.createResponse(false, `Error playing track: ${error.message}`);
    }
  }

  async playTrack(interaction, query) {
    const track = await this.searchYouTube(query);
    if (!track) {
      return this.createResponse(false, 'No results found for your search');
    }

    const currentQueue = this.distube.getQueue(interaction.guildId);
    const wasPlaying = currentQueue?.songs?.length > 0 && !currentQueue.stopped;

    try {
      await Promise.race([
        this.distube.play(interaction.member.voice.channel, track.url, {
          textChannel: interaction.channel,
          member: interaction.member
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout - cannot connect to voice channel')), 15000)
        )
      ]);

      const message = wasPlaying 
        ? `Added to queue: ${track.title}` 
        : `Now playing: ${track.title}`;

      return this.createResponse(true, message, { track, addedToQueue: wasPlaying });
    } catch (playError) {
      logger.error('Play error details:', playError.message);
      
      if (playError.message.includes('Sign in to confirm') || 
          playError.message.includes('bot') ||
          playError.message.includes('YTDLP_ERROR')) {
        return await this.handleYouTubeBlocked(track);
      }
      
      if (playError.message.includes('timeout') ||
          playError.message.includes('Cannot connect') ||
          playError.message.includes('Connection timeout')) {
        return this.createResponse(false, 'Voice connection failed. Try another channel, check your network, or /leave then /play.');
      }

      return this.createResponse(false, playError.message);
    }
  }

  async handleYouTubeBlocked(track) {
    logger.warn(`YouTube blocked: ${track.title}`);
    return this.createResponse(
      false,
      `YouTube blocked "${track.title}". Try another search, a direct video URL, or check the network.`
    );
  }

  executeQueueAction(guildId, action, successMessage, errorMessage) {
    if (!guildId || !this.distube) {
      return this.createResponse(false, errorMessage);
    }
    
    try {
      const queue = this.distube.getQueue(guildId);
      if (!queue) {
        return this.createResponse(false, errorMessage);
      }
      
      switch (action) {
      case 'pause':
        if (queue.paused) return this.createResponse(false, 'Already paused');
        this.distube.pause(guildId);
        break;
      case 'resume':
        if (!queue.paused) return this.createResponse(false, 'Not paused');
        this.distube.resume(guildId);
        break;
      case 'stop':
        this.distube.stop(guildId);
        break;
      case 'skip':
        if (queue.songs.length <= 1) return this.createResponse(false, 'No next song in queue');
        this.distube.skip(guildId);
        break;
      case 'previous':
        this.distube.previous(guildId);
        break;
      default:
        return this.createResponse(false, 'Invalid action');
      }
      
      return this.createResponse(true, successMessage);
    } catch (error) {
      logger.error(`Queue action error (${action}):`, error.message);
      return this.createResponse(false, errorMessage);
    }
  }

  pause(guildId) {
    return this.executeQueueAction(guildId, 'pause', 'Paused', 'Nothing is playing');
  }

  resume(guildId) {
    return this.executeQueueAction(guildId, 'resume', 'Resumed', 'Nothing is paused');
  }

  stop(guildId) {
    return this.executeQueueAction(guildId, 'stop', 'Stopped', 'Nothing is playing');
  }

  skip(guildId) {
    return this.executeQueueAction(guildId, 'skip', 'Skipped to next song', 'No next song in queue');
  }

  previous(guildId) {
    return this.executeQueueAction(guildId, 'previous', 'Playing previous song', 'No previous song');
  }

  setVolume(guildId, volume) {
    try {
      this.volume = Math.max(0, Math.min(100, volume));
      if (guildId) {
        this.distube.setVolume(guildId, this.volume);
      }
      return { success: true, volume: this.volume };
    } catch (error) {
      logger.error('Volume update failed:', error.message);
      return this.createResponse(false, 'Unable to set volume');
    }
  }

  getCurrentTrack(guildId) {
    if (!guildId || !this.distube) {
      return this.createEmptyTrackResponse();
    }

    try {
      const queue = this.distube.getQueue(guildId);
      if (!queue?.songs?.[0]) {
        return this.createEmptyTrackResponse();
      }

      const song = queue.songs[0];
      return {
        track: {
          title: song.name,
          channel: song.uploader?.name || 'Unknown',
          url: song.url
        },
        isPlaying: !queue.paused,
        queue: queue.songs.length,
        volume: queue.volume || this.volume,
        repeatMode: this.repeatMode
      };
    } catch (error) {
      logger.error('getCurrentTrack error:', error.message);
      return this.createEmptyTrackResponse();
    }
  }

  getQueue(guildId) {
    if (!guildId || !this.distube) {
      return this.createEmptyQueueResponse();
    }

    try {
      const queue = this.distube.getQueue(guildId);
      if (!queue?.songs?.length) {
        return this.createEmptyQueueResponse();
      }

      return {
        current: {
          title: queue.songs[0].name,
          channel: queue.songs[0].uploader?.name || 'Unknown'
        },
        queue: queue.songs.slice(1).map(song => ({
          title: song.name,
          channel: song.uploader?.name || 'Unknown'
        })),
        length: queue.songs.length
      };
    } catch (error) {
      logger.error('getQueue error:', error.message);
      return this.createEmptyQueueResponse();
    }
  }

  disconnect() {
    return this.createResponse(true, 'Disconnected');
  }

}

export default YouTubeAPI;
