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
            update: false
          })],
          ffmpeg: {
            path: ffmpegPath
          },
          emitNewSongOnly: false,
          leaveOnEmpty: false,
          leaveOnFinish: false,
          leaveOnStop: false
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
      console.log('Next songs in queue:', queue.songs?.length || 0);
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
          maxResults: 1,
          videoCategoryId: '10',
          order: 'relevance',
          safeSearch: 'none',
          videoEmbeddable: 'true',
          videoSyndicated: 'true'
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Search timeout')), 30000)
        )
      ]);

      if (response.data.items.length === 0) {
        return null;
      }

      const item = response.data.items[0];
      const result = {
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      };

      return result;
    } catch (error) {
      console.error('YouTube search error:', error);
      return null;
    }
  }

  async play(interaction, query = null) {
    try {
      console.log('Play command called. DisTube status:', !!this.distube);
      
      if (!this.distube) {
        console.log('DisTube not initialized, attempting emergency initialization...');
        
        if (interaction && interaction.client) {
          try {
            await this.initializeDistube(interaction.client);
            
            if (!this.distube) {
              console.log('Emergency initialization failed - DisTube still null');
              return { success: false, message: 'Music system initialization failed. Please try again or contact support.' };
            }
            
            console.log('Emergency initialization successful, waiting 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (initError) {
            console.error('Emergency initialization error:', initError);
            return { success: false, message: 'Music system initialization failed. Please try again or contact support.' };
          }
        } else {
          return { success: false, message: 'Music system not ready. Please try again or contact support.' };
        }
      }

      console.log('DisTube is ready, processing play command...');

      if (query) {
        const track = await this.searchYouTube(query);
        
        if (!track) {
          return { success: false, message: 'No results found' };
        }
        
        let currentQueue = null;
        let wasPlaying = false;
        
        try {
          currentQueue = this.distube.getQueue(interaction.guildId);
          wasPlaying = currentQueue && currentQueue.songs && currentQueue.songs.length > 0 && !currentQueue.stopped;
          console.log('Queue check completed. Was playing:', wasPlaying);
        } catch (error) {
          console.log('Queue check error:', error.message);
          wasPlaying = false;
        }
        
        console.log('Starting DisTube play...');
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
        
        console.log('Play command completed successfully');
        return { 
          success: true, 
          track: track,
          message: message,
          addedToQueue: wasPlaying
        };
        
      } else {
        return { success: false, message: 'No track to play' };
      }
    } catch (error) {
      console.error('Play error:', error);
      return { success: false, message: `Error playing track: ${error.message}` };
    }
  }

  pause(guildId) {
    try {
      if (guildId) {
        const queue = this.distube.getQueue(guildId);
        if (queue && !queue.paused) {
          this.distube.pause(guildId);
          return { success: true, message: 'Paused' };
        }
      }
      return { success: false, message: 'Nothing is playing' };
    } catch {
      return { success: false, message: 'Nothing is playing' };
    }
  }

  resume(guildId) {
    try {
      if (guildId) {
        const queue = this.distube.getQueue(guildId);
        if (queue && queue.paused) {
          this.distube.resume(guildId);
          return { success: true, message: 'Resumed' };
        }
      }
      return { success: false, message: 'Nothing is paused' };
    } catch {
      return { success: false, message: 'Nothing is paused' };
    }
  }

  stop(guildId) {
    try {
      if (guildId) {
        const queue = this.distube.getQueue(guildId);
        if (queue) {
          this.distube.stop(guildId);
          return { success: true, message: 'Stopped' };
        }
      }
      return { success: false, message: 'Nothing is playing' };
    } catch {
      return { success: false, message: 'Nothing is playing' };
    }
  }

  skip(guildId) {
    try {
      if (guildId) {
        const queue = this.distube.getQueue(guildId);
        if (queue && queue.songs.length > 1) {
          this.distube.skip(guildId);
          return { success: true, message: 'Skipped to next song' };
        }
      }
      return { success: false, message: 'No next song in queue' };
    } catch {
      return { success: false, message: 'No next song in queue' };
    }
  }

  previous(guildId) {
    try {
      if (guildId) {
        const queue = this.distube.getQueue(guildId);
        if (queue) {
          this.distube.previous(guildId);
          return { success: true, message: 'Playing previous song' };
        }
      }
      return { success: false, message: 'No previous song' };
    } catch {
      return { success: false, message: 'No previous song' };
    }
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
    try {
      if (guildId) {
        const queue = this.distube.getQueue(guildId);
        if (queue && queue.songs[0]) {
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
        }
      }
    } catch {
    }
    
    return {
      track: null,
      isPlaying: false,
      queue: 0,
      volume: this.volume,
      repeatMode: this.repeatMode
    };
  }

  getQueue(guildId) {
    try {
      if (guildId && this.distube) {
        const queue = this.distube.getQueue(guildId);
        if (queue && queue.songs && queue.songs.length > 0) {
          return {
            current: queue.songs[0] ? {
              title: queue.songs[0].name,
              channel: queue.songs[0].uploader?.name || 'Unknown'
            } : null,
            queue: queue.songs.slice(1).map(song => ({
              title: song.name,
              channel: song.uploader?.name || 'Unknown'
            })),
            length: queue.songs.length
          };
        }
      }
    } catch (error) {
      console.log('Queue access error:', error.message);
    }
    
    return { current: null, queue: [], length: 0 };
  }

  disconnect() {
    return { success: true, message: 'Disconnected' };
  }

}

export default YouTubeAPI;
