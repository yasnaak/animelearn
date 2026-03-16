export interface PanelData {
  panelId: string;
  // Static image layers (original approach)
  backgroundImageUrl: string;
  characterLayerUrl: string | null;
  effectLayerUrl: string | null;
  // Video clip (LTX-2.3 approach — if present, takes priority over static layers)
  videoUrl: string | null;
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

// ============================================================
// SHOT-BASED TYPES (v2 pipeline — cinematic anime production)
// ============================================================

export interface ShotData {
  shotId: string;
  shotType: string;
  videoUrl: string;
  fallbackImageUrl: string;
  durationFrames: number;
  camera: {
    movement: string;
    intensity: number;
  };
  dialogue: Array<{
    characterId: string;
    characterName: string;
    text: string;
    audioUrl: string;
    durationMs: number;
    delivery: string;
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
  transition: 'cut' | 'crossfade' | 'fade_black' | 'fade_white' | 'whip_pan' | 'match_cut' | 'smash_cut' | 'dissolve';
}

export interface SceneDataV2 {
  sceneId: string;
  mood: string;
  shots: ShotData[];
  musicTrack: {
    audioUrl: string;
    volume: number;
    loop: boolean;
  } | null;
  transitionOut: 'cut' | 'fade_black' | 'fade_white' | 'dissolve' | 'whip_pan' | 'match_cut' | 'smash_cut';
}

export interface EpisodeCompositionPropsV2 {
  title: string;
  episodeNumber: number;
  seriesTitle: string;
  coldOpen: string | null;
  scenes: SceneDataV2[];
  endCard: {
    summaryPoints: string[];
    teaserNextEpisode: string | null;
  };
  fps: number;
  width: number;
  height: number;
}
