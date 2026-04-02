import { google } from 'googleapis';
import type { Client, ChatInputCommandInteraction, GuildMember, GuildTextBasedChannel } from 'discord.js';
import { DisTube } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';
import ffmpegStatic from 'ffmpeg-static';
import { createLogger } from './utils.js';

const logger = createLogger('YouTubeAPI');

function voiceJoinTimeoutMs(): number {
  const raw = process.env.VOICE_CONNECT_TIMEOUT_MS;
  if (raw === undefined || raw === '') {
    return 60000;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 5000 ? n : 60000;
}

type TrackInfo = {
  videoId: string;
  title: string;
  channel: string;
  url: string;
};

type PlayResult = {
  success: boolean;
  message: string;
  track?: TrackInfo;
  addedToQueue?: boolean;
};

class YouTubeAPI {
  youtube: ReturnType<typeof google.youtube>;
  distube: DisTube | null = null;
  volume = 50;
  repeatMode = 'none';

  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });
  }

  createResponse(success: boolean, message: string, data: Record<string, unknown> = {}): PlayResult {
    return { success, message, ...data };
  }

  createEmptyTrackResponse() {
    return {
      track: null as null,
      isPlaying: false,
      queue: 0,
      volume: this.volume,
      repeatMode: this.repeatMode
    };
  }

  createEmptyQueueResponse() {
    return { current: null as null, queue: [] as { title: string; channel: string }[], length: 0 };
  }

  async initializeDistube(client: Client) {
    if (this.distube) {
      return;
    }
    try {
      const ffmpegPath: string = typeof ffmpegStatic === 'string' ? ffmpegStatic : 'ffmpeg';
      if (typeof ffmpegPath === 'string' && ffmpegPath !== 'ffmpeg') {
        const fs = await import('node:fs');
        try {
          fs.accessSync(ffmpegPath, fs.constants.F_OK);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.warn('ffmpeg path not readable:', msg);
        }
      }

      process.env.FFMPEG_PATH = ffmpegPath;

      const ytDlpOptions = {
        ffmpegPath: ffmpegPath,
        update: false,
        quality: 'highestaudio' as const,
        extractorArgs: {
          youtube: [
            '--no-check-certificate',
            '--prefer-free-formats',
            '--no-playlist',
            '--extract-flat',
            'false',
            '--socket-timeout',
            '30',
            '--retries',
            '3'
          ]
        }
      };

      if (process.env.NODE_ENV === 'production') {
        this.distube = new DisTube(client, {
          ffmpeg: { path: ffmpegPath }
        });
      } else {
        this.distube = new DisTube(client, {
          plugins: [new YtDlpPlugin(ytDlpOptions) as never],
          ffmpeg: { path: ffmpegPath }
        });
      }

      this.setupDisTubeEvents();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('DisTube init failed:', msg);
      this.distube = null;
      throw error;
    }
  }

  setupDisTubeEvents() {
    if (!this.distube) return;

    const d = this.distube as DisTube & {
      on(event: string, listener: (...args: unknown[]) => void): DisTube;
    };

    d.on('playSong', (...args: unknown[]) => {
      const song = args[1] as { name: string };
      logger.info(`Playing: ${song.name}`);
    });

    d.on('addSong', (...args: unknown[]) => {
      const song = args[1] as { name: string };
      logger.info(`Queued: ${song.name}`);
    });

    d.on('finish', (...args: unknown[]) => {
      const queue = args[0] as { id: string };
      logger.info(`Queue empty, guild ${queue.id}`);
    });

    d.on('finishSong', (...args: unknown[]) => {
      const queue = args[0] as { voice?: { audioResource?: { playbackDuration?: number } } };
      const song = args[1] as { name: string };
      const playbackDuration = queue.voice?.audioResource?.playbackDuration;
      if (!playbackDuration || playbackDuration < 5000) {
        logger.warn(`Short playback (${playbackDuration ?? 0}ms): ${song.name}`);
      }
    });

    d.on('error', (...args: unknown[]) => {
      const channel = args[0] as { send?: (s: string) => Promise<unknown> } | null;
      const error = args[1] as Error;
      logger.error('DisTube:', error.message);
      if (channel?.send) {
        channel.send(`Playback error: ${error.message}`).catch(() => {});
      }
    });

    d.on('disconnect', (...args: unknown[]) => {
      const queue = args[0] as { id: string };
      logger.info(`Voice disconnected, guild ${queue.id}`);
    });

    d.on('empty', (...args: unknown[]) => {
      const queue = args[0] as { id: string };
      logger.info(`Voice channel empty, guild ${queue.id}`);
    });

    d.on('initQueue', (...args: unknown[]) => {
      const queue = args[0] as { volume: number };
      queue.volume = this.volume;
    });

    d.on('debug', (...args: unknown[]) => {
      const message = args[0];
      logger.debug('DisTube:', message);
    });
  }

  async searchYouTube(query: string): Promise<TrackInfo | null> {
    try {
      const response = await Promise.race([
        this.youtube.search.list({
          part: ['snippet'] as ['snippet'],
          q: query,
          type: ['video'],
          maxResults: 5,
          videoCategoryId: '10',
          order: 'relevance',
          safeSearch: 'none',
          videoEmbeddable: 'true',
          videoSyndicated: 'true',
          videoDuration: 'any',
          fields: 'items(id/videoId,snippet(title,channelTitle))'
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Search timeout')), 10000)
        )
      ]);

      if (!response.data.items?.length) {
        return null;
      }

      const item = response.data.items[0];
      const videoId = item.id?.videoId;
      if (!videoId || !item.snippet) {
        return null;
      }

      return {
        videoId,
        title: item.snippet.title ?? '',
        channel: item.snippet.channelTitle ?? '',
        url: `https://www.youtube.com/watch?v=${videoId}`
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('YouTube search error:', msg);
      return null;
    }
  }

  async play(interaction: ChatInputCommandInteraction, query: string | null = null): Promise<PlayResult> {
    try {
      if (!this.distube) {
        if (interaction?.client) {
          await this.initializeDistube(interaction.client);
          if (!this.distube) {
            return this.createResponse(false, 'Music backend failed to start. Try again.');
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          return this.createResponse(false, 'Music backend not ready.');
        }
      }

      if (!query) {
        return this.createResponse(false, 'No track to play');
      }

      return await this.playTrack(interaction, query);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Play error:', msg);
      return this.createResponse(false, `Error playing track: ${msg}`);
    }
  }

  async playTrack(interaction: ChatInputCommandInteraction, query: string): Promise<PlayResult> {
    const track = await this.searchYouTube(query);
    if (!track) {
      return this.createResponse(false, 'No results found for your search');
    }

    if (!this.distube) {
      return this.createResponse(false, 'Music backend not ready.');
    }

    const currentQueue = this.distube.getQueue(interaction.guildId ?? '');
    const wasPlaying = Boolean(currentQueue?.songs?.length && !currentQueue.stopped);

    const voiceChannel = interaction.member && 'voice' in interaction.member
      ? interaction.member.voice.channel
      : null;

    if (!voiceChannel) {
      return this.createResponse(false, 'Join a voice channel first.');
    }

    const joinMs = voiceJoinTimeoutMs();
    logger.info(`Play: "${track.title}" (voice/setup timeout ${joinMs}ms)`);
    try {
      await Promise.race([
        this.distube.play(voiceChannel, track.url, {
          textChannel: interaction.channel as GuildTextBasedChannel,
          member: interaction.member as GuildMember
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Connection timeout after ${joinMs}ms (voice join / playback setup). Set VOICE_CONNECT_TIMEOUT_MS if needed.`
                )
              ),
            joinMs
          )
        )
      ]);

      const message = wasPlaying
        ? `Added to queue: ${track.title}`
        : `Now playing: ${track.title}`;

      return this.createResponse(true, message, { track, addedToQueue: wasPlaying });
    } catch (playError) {
      const msg = playError instanceof Error ? playError.message : String(playError);
      logger.error('Play error details:', msg);

      if (
        msg.includes('Sign in to confirm') ||
        msg.includes('bot') ||
        msg.includes('YTDLP_ERROR')
      ) {
        return await this.handleYouTubeBlocked(track);
      }

      if (
        msg.includes('timeout') ||
        msg.includes('Cannot connect') ||
        msg.includes('Connection timeout')
      ) {
        return this.createResponse(
          false,
          'Voice connection timed out. Try /leave then /play, another voice channel, or wait and retry. ' +
            'On Windows, allow Node through the firewall for UDP; VPNs can block Discord voice. ' +
            `Optional: raise VOICE_CONNECT_TIMEOUT_MS in .env (current limit ${joinMs}ms).`
        );
      }

      return this.createResponse(false, msg);
    }
  }

  async handleYouTubeBlocked(track: TrackInfo): Promise<PlayResult> {
    logger.warn(`YouTube blocked: ${track.title}`);
    return this.createResponse(
      false,
      `YouTube blocked "${track.title}". Try another search, a direct video URL, or check the network.`
    );
  }

  executeQueueAction(
    guildId: string | null,
    action: 'pause' | 'resume' | 'stop' | 'skip' | 'previous',
    successMessage: string,
    errorMessage: string
  ): PlayResult {
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
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Queue action error (${action}):`, msg);
      return this.createResponse(false, errorMessage);
    }
  }

  pause(guildId: string | null) {
    return this.executeQueueAction(guildId, 'pause', 'Paused', 'Nothing is playing');
  }

  resume(guildId: string | null) {
    return this.executeQueueAction(guildId, 'resume', 'Resumed', 'Nothing is paused');
  }

  stop(guildId: string | null) {
    return this.executeQueueAction(guildId, 'stop', 'Stopped', 'Nothing is playing');
  }

  skip(guildId: string | null) {
    return this.executeQueueAction(guildId, 'skip', 'Skipped to next song', 'No next song in queue');
  }

  previous(guildId: string | null) {
    return this.executeQueueAction(guildId, 'previous', 'Playing previous song', 'No previous song');
  }

  setVolume(guildId: string | null, volume: number): PlayResult | { success: true; volume: number } {
    try {
      this.volume = Math.max(0, Math.min(100, volume));
      if (guildId && this.distube) {
        this.distube.setVolume(guildId, this.volume);
      }
      return { success: true, volume: this.volume };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Volume update failed:', msg);
      return this.createResponse(false, 'Unable to set volume');
    }
  }

  getCurrentTrack(guildId: string | null) {
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
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('getCurrentTrack error:', msg);
      return this.createEmptyTrackResponse();
    }
  }

  getQueue(guildId: string | null) {
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
        queue: queue.songs.slice(1).map((song) => ({
          title: song.name,
          channel: song.uploader?.name || 'Unknown'
        })),
        length: queue.songs.length
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('getQueue error:', msg);
      return this.createEmptyQueueResponse();
    }
  }

  disconnect() {
    return this.createResponse(true, 'Disconnected');
  }
}

export default YouTubeAPI;
