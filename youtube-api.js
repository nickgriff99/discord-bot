import { google } from 'googleapis';
import { DisTube } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';
import ffmpegStatic from 'ffmpeg-static';

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

  async initializeDistube(client) {
    if (!this.distube) {
      try {
        console.log('Starting DisTube initialization...');
        console.log('Node.js version:', process.version);
        console.log('Environment:', process.env.NODE_ENV);
        
        const ffmpegPath = ffmpegStatic || 'ffmpeg';
        console.log('Initializing DisTube with ffmpeg path:', ffmpegPath);
        console.log('ffmpeg-static resolved to:', ffmpegPath);
        
        if (typeof ffmpegPath === 'string' && ffmpegPath !== 'ffmpeg') {
          const fs = await import('fs');
          try {
            fs.accessSync(ffmpegPath, fs.constants.F_OK);
            console.log('✅ FFmpeg binary found and accessible');
          } catch (error) {
            console.log('❌ FFmpeg binary not accessible:', error.message);
          }
        }
        
        process.env.FFMPEG_PATH = ffmpegPath;
        
        console.log('Creating DisTube with minimal configuration...');
        this.distube = new DisTube(client, {
          plugins: [new YtDlpPlugin({
            ffmpegPath: ffmpegPath
          })],
          ffmpeg: {
            path: ffmpegPath
          }
        });
        
        console.log('✅ DisTube instance created successfully');
        this.setupDisTubeEvents();
        console.log('✅ DisTube events configured');
        console.log('✅ DisTube initialization completed successfully');
      } catch (error) {
        console.error('❌ Failed to initialize DisTube:', error);
        console.error('Error stack:', error.stack);
        this.distube = null;
        throw error;
      }
    } else {
      console.log('DisTube already initialized');
    }
  }

  setupDisTubeEvents() {
    this.distube.on('playSong', (queue, song) => {
      console.log('🎵 Now playing:', song.name);
      console.log('Song duration:', song.duration);
      console.log('Song URL:', song.url);
      console.log('Voice connection status:', queue.voice?.connection?.state?.status);
      console.log('Audio resource state:', queue.voice?.audioResource?.playbackDuration);
      
      setTimeout(() => {
        console.log('🕐 5 seconds check - still playing?', queue.playing);
        console.log('🕐 Current song:', queue.songs[0]?.name || 'none');
        console.log('🕐 Audio resource duration:', queue.voice?.audioResource?.playbackDuration);
        
        if (!queue.playing && queue.songs.length > 0) {
          console.log('⚠️ DIAGNOSIS: Audio streaming is failing immediately after creation');
          console.log('🏥 This indicates Railway container cannot maintain real-time audio streams to Discord');
          console.log('💡 Recommendation: Consider alternative hosting (VPS, dedicated server) for audio streaming');
        }
      }, 5000);
    });

    this.distube.on('addSong', (queue, song) => {
      console.log('➕ Added to queue:', song.name);
    });

    this.distube.on('finish', (queue) => {
      console.log('🏁 Queue finished for guild:', queue.id);
      console.log('Reason for finish - queue songs remaining:', queue.songs?.length || 0);
    });

    this.distube.on('finishSong', (queue, song) => {
      console.log('🎤 Song finished:', song.name);
      console.log('Song played for duration:', queue.voice?.audioResource?.playbackDuration || 'unknown');
      console.log('Next songs in queue:', queue.songs?.length || 0);
      
      const playbackDuration = queue.voice?.audioResource?.playbackDuration;
      if (!playbackDuration || playbackDuration < 5000) {
        console.log('💀 CONFIRMED: Stream failed - played for < 5 seconds');
        console.log('🐛 Issue: Railway containers cannot sustain Discord voice connections');
      }
    });

    this.distube.on('error', (channel, error) => {
      console.error('❌ DisTube error:', error.message);
      console.error('Error code:', error.errorCode);
      console.error('Full error:', error);
      if (channel) {
        channel.send(`❌ Music error: ${error.message}`).catch(() => {});
      }
    });

    this.distube.on('disconnect', (queue) => {
      console.log('🔌 DisTube disconnected from guild:', queue.id);
    });

    this.distube.on('empty', (queue) => {
      console.log('📭 Voice channel empty for guild:', queue.id);
    });

    this.distube.on('initQueue', (queue) => {
      console.log('🎶 Queue initialized for guild:', queue.id);
      console.log('Initial voice connection state:', queue.voice?.connection?.state?.status);
      queue.volume = this.volume;
    });

    this.distube.on('debug', (message) => {
      console.log('🐛 DisTube debug:', message);
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
      console.error('YouTube search error:', error.message);
      return null;
    }
  }

  async play(interaction, query = null) {
    try {
      if (!this.distube) {
        console.log('DisTube not initialized, attempting emergency initialization...');
        if (interaction?.client) {
          await this.initializeDistube(interaction.client);
          if (!this.distube) {
            return { success: false, message: 'Music system initialization failed. Please try again.' };
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          return { success: false, message: 'Music system not ready. Please try again.' };
        }
      }

      if (!query) {
        return { success: false, message: 'No track to play' };
      }

      const track = await this.searchYouTube(query);
      if (!track) {
        return { success: false, message: 'No results found for your search' };
      }

      const currentQueue = this.distube.getQueue(interaction.guildId);
      const wasPlaying = currentQueue?.songs?.length > 0 && !currentQueue.stopped;

      await Promise.race([
        this.distube.play(interaction.member.voice.channel, track.url, {
          textChannel: interaction.channel,
          member: interaction.member
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Play timeout - try again')), 15000)
        )
      ]);

      const message = wasPlaying 
        ? `Added to queue: ${track.title}` 
        : `Now playing: ${track.title}`;

      return { 
        success: true, 
        track,
        message,
        addedToQueue: wasPlaying
      };
    } catch (error) {
      console.error('Play error:', error.message);
      return { success: false, message: `Error playing track: ${error.message}` };
    }
  }

  executeQueueAction(guildId, action, successMessage, errorMessage) {
    if (!guildId || !this.distube) {
      return { success: false, message: errorMessage };
    }
    
    try {
      const queue = this.distube.getQueue(guildId);
      if (!queue) {
        return { success: false, message: errorMessage };
      }
      
      switch (action) {
      case 'pause':
        if (queue.paused) return { success: false, message: 'Already paused' };
        this.distube.pause(guildId);
        break;
      case 'resume':
        if (!queue.paused) return { success: false, message: 'Not paused' };
        this.distube.resume(guildId);
        break;
      case 'stop':
        this.distube.stop(guildId);
        break;
      case 'skip':
        if (queue.songs.length <= 1) return { success: false, message: 'No next song in queue' };
        this.distube.skip(guildId);
        break;
      case 'previous':
        this.distube.previous(guildId);
        break;
      default:
        return { success: false, message: 'Invalid action' };
      }
      
      return { success: true, message: successMessage };
    } catch (error) {
      console.error(`Queue action error (${action}):`, error.message);
      return { success: false, message: errorMessage };
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
    } catch {
      return { success: false, message: 'Unable to set volume' };
    }
  }

  getCurrentTrack(guildId) {
    if (!guildId || !this.distube) {
      return { track: null, isPlaying: false, queue: 0, volume: this.volume, repeatMode: this.repeatMode };
    }

    try {
      const queue = this.distube.getQueue(guildId);
      if (!queue?.songs?.[0]) {
        return { track: null, isPlaying: false, queue: 0, volume: this.volume, repeatMode: this.repeatMode };
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
      console.error('getCurrentTrack error:', error.message);
      return { track: null, isPlaying: false, queue: 0, volume: this.volume, repeatMode: this.repeatMode };
    }
  }

  getQueue(guildId) {
    if (!guildId || !this.distube) {
      return { current: null, queue: [], length: 0 };
    }

    try {
      const queue = this.distube.getQueue(guildId);
      if (!queue?.songs?.length) {
        return { current: null, queue: [], length: 0 };
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
      console.error('getQueue error:', error.message);
      return { current: null, queue: [], length: 0 };
    }
  }

  disconnect() {
    return { success: true, message: 'Disconnected' };
  }

}

export default YouTubeAPI;
