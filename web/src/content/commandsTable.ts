export type CommandRow = {
  command: string;
  parameters: string;
  purpose: string;
};

export const commandRows: CommandRow[] = [
  { command: '/play', parameters: 'query (required)', purpose: 'Search and play or queue a track' },
  { command: '/pause', parameters: 'none', purpose: 'Pause current playback' },
  { command: '/resume', parameters: 'none', purpose: 'Resume paused playback' },
  { command: '/skip', parameters: 'none', purpose: 'Skip to next queued song' },
  { command: '/previous', parameters: 'none', purpose: 'Return to previous track' },
  { command: '/volume', parameters: 'level 0–100', purpose: 'Set volume percentage' },
  { command: '/nowplaying', parameters: 'none', purpose: 'Show current track details' },
  { command: '/queue', parameters: 'none', purpose: 'Display queue list' },
  { command: '/stop', parameters: 'none', purpose: 'Stop playback and clear queue' },
  { command: '/join', parameters: 'none', purpose: 'Validate voice readiness' },
  { command: '/leave', parameters: 'none', purpose: 'Disconnect from voice channel' },
  { command: '/debug', parameters: 'none', purpose: 'Display system diagnostics' }
];
