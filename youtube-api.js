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

  initializeDistube(client) {
    if (!this.distube) {
      try {
        const ffmpegPath = ffmpegStatic || 'ffmpeg';
        console.log('Initializing DisTube with ffmpeg path:', ffmpegPath);
        
        process.env.FFMPEG_PATH = ffmpegPath;
        
        this.distube = new DisTube(client, {
          plugins: [new YtDlpPlugin({
            update: false,
            ytdlpOptions: [
              '--no-check-certificate', 
              '--prefer-free-formats',
              '--no-call-home',
              '--no-cache-dir',
              '--socket-timeout', '30',
              '--retries', '3'
            ]
          })],
          ffmpeg: {
            path: ffmpegPath,
            args: {
              global: ['-loglevel', 'error'],
              input: ['-reconnect', '1', '-reconnect_streamed', '1'],
              output: ['-f', 'opus', '-ar', '48000', '-ac', '2']
            }
          },
          youtubeDL: false,
          ytdlOptions: {
            highWaterMark: 1024 * 1024 * 64,
            quality: 'highestaudio',
            filter: 'audioonly',
            opusEncoded: true,
            encoderArgs: ['-af', 'bass=g=10,dynaudnorm=f=200']
          }
        });
        
        console.log('DisTube initialized successfully');
        this.setupDisTubeEvents();
      } catch (error) {
        console.error('Failed to initialize DisTube:', error);
        this.distube = null;
      }
    }
  }

  setupDisTubeEvents() {
    this.distube.on('playSong', (queue, song) => {
      console.log('🎵 Now playing:', song.name);
    });

    this.distube.on('addSong', (queue, song) => {
      console.log('➕ Added to queue:', song.name);
    });

    this.distube.on('finish', () => {
      console.log('🏁 Queue finished');
    });

    this.distube.on('error', (_, error) => {
      console.error('❌ DisTube error:', error.message);
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
      if (!this.distube) {
        console.log('DisTube not initialized, attempting to initialize...');
        
        if (interaction && interaction.client) {
          this.initializeDistube(interaction.client);
          
          if (!this.distube) {
            return { success: false, message: 'Music system not ready, please try again in a few seconds' };
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          return { success: false, message: 'Music system not ready, please try again in a few seconds' };
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
