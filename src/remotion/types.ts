export interface PanelData {
  panelId: string;
  backgroundImageUrl: string;
  characterLayerUrl: string | null;
  effectLayerUrl: string | null;
  durationFrames: number;
  parallax: {
    type: 'slow_pan_left' | 'slow_pan_right' | 'zoom_in' | 'zoom_out' | 'shake' | 'float' | 'dramatic_zoom' | 'static';
    intensity: number;
  };
  dialogue: Array<{
    characterId: string;
    text: string;
    audioUrl: string;
    durationMs: number;
    tone: string;
  }>;
  narration: {
    text: string;
    audioUrl: string;
    durationMs: number;
  } | null;
  sfx: {
    audioUrl: string;
    timing: 'start' | 'middle' | 'end';
    volume: number;
  } | null;
  transition: 'cut' | 'crossfade' | 'fade_black' | 'fade_white' | 'swipe_left' | 'zoom_out' | 'dissolve';
}

export interface SceneData {
  sceneId: string;
  mood: string;
  panels: PanelData[];
  musicTrack: {
    audioUrl: string;
    volume: number;
    loop: boolean;
  } | null;
}

export interface EpisodeCompositionProps {
  title: string;
  episodeNumber: number;
  seriesTitle: string;
  scenes: SceneData[];
  endCard: {
    summaryPoints: string[];
    teaserNextEpisode: string | null;
  };
  fps: number;
  width: number;
  height: number;
}
