export const PLAN_LIMITS = {
  free: {
    episodesPerMonth: 2,
    maxPdfPages: 50,
    maxYoutubeMinutes: 15,
  },
  creator: {
    episodesPerMonth: 20,
    maxPdfPages: 200,
    maxYoutubeMinutes: 60,
  },
  pro: {
    episodesPerMonth: 100,
    maxPdfPages: 500,
    maxYoutubeMinutes: 120,
  },
} as const;

export const GENERATION_LIMITS = {
  maxClaudeCallsPerEpisode: 10,
  maxImagesPerEpisode: 100,
  maxTTSRequestsPerEpisode: 50,
  maxMusicRequestsPerEpisode: 10,
  maxSFXRequestsPerEpisode: 20,
} as const;

export const VISUAL_STYLES = [
  'clean_modern',
  'soft_pastel',
  'dark_dramatic',
  'retro_classic',
] as const;

export type VisualStyle = (typeof VISUAL_STYLES)[number];
