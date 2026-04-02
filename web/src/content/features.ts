export type Feature = {
  tag?: string;
  title: string;
  body: string;
  wide?: boolean;
  accent?: boolean;
};

export const features: Feature[] = [
  {
    tag: 'Play',
    title: 'Search',
    body: '/play with text or a URL; first YouTube hit from the Data API.',
    accent: true
  },
  {
    title: 'Queue',
    body: 'Add tracks, view order, skip, previous.'
  },
  {
    title: 'Transport',
    body: 'Pause, resume, stop, volume.'
  },
  {
    title: 'Status',
    body: '/nowplaying and /queue for title, channel, repeat, length.',
    wide: true
  },
  {
    title: 'Voice',
    body: '/join and /leave for VC lifecycle.'
  },
  {
    title: 'Debug',
    body: '/debug for process stats and whether DisTube loaded.',
    wide: true
  }
];
