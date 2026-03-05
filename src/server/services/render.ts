import type {
  EpisodeCompositionProps,
  PanelData,
  SceneData,
} from '@/remotion/types';
import type { EpisodeScript, AudioDirection, SeriesPlan } from './ai-pipeline';

const FPS = 30;
const DEFAULT_PANEL_DURATION_SECONDS = 3.5;

interface PanelRecord {
  panelId: string;
  backgroundImageUrl: string | null;
  characterLayerUrl: string | null;
  effectLayerUrl: string | null;
  metadata: unknown;
}

interface AudioTrackRecord {
  trackType: string;
  audioUrl: string;
  durationMs: number;
  panelId: string | null;
  metadata: unknown;
}

/**
 * Assembles all episode data into Remotion composition props
 */
export function assembleEpisodeProps(params: {
  episodeNumber: number;
  episodeTitle: string;
  seriesTitle: string;
  script: EpisodeScript;
  audioDirection: AudioDirection;
  panelRecords: PanelRecord[];
  audioTrackRecords: AudioTrackRecord[];
}): EpisodeCompositionProps {
  const {
    episodeNumber,
    episodeTitle,
    seriesTitle,
    script,
    audioDirection,
    panelRecords,
    audioTrackRecords,
  } = params;

  // Index panels and audio by panelId
  const panelMap = new Map(panelRecords.map((p) => [p.panelId, p]));
  const audioByPanel = new Map<string, AudioTrackRecord[]>();
  const musicTracks: AudioTrackRecord[] = [];

  for (const track of audioTrackRecords) {
    if (track.trackType === 'music') {
      musicTracks.push(track);
    } else if (track.panelId) {
      const existing = audioByPanel.get(track.panelId) ?? [];
      existing.push(track);
      audioByPanel.set(track.panelId, existing);
    }
  }

  // Map audio direction timeline entries by panel_id
  const directionMap = new Map(
    audioDirection.audio_timeline.map((entry) => [entry.panel_id, entry]),
  );

  // Build scenes
  const scenes: SceneData[] = script.scenes.map((scriptScene) => {
    const panels: PanelData[] = scriptScene.panels.map((scriptPanel) => {
      const panelRecord = panelMap.get(scriptPanel.panel_id);
      const panelAudio = audioByPanel.get(scriptPanel.panel_id) ?? [];
      const directionEntry = directionMap.get(scriptPanel.panel_id);

      // Calculate duration based on dialogue
      const dialogueTracks = panelAudio.filter(
        (t) => t.trackType === 'dialogue',
      );
      const narrationTrack = panelAudio.find(
        (t) => t.trackType === 'narration',
      );
      const sfxTrack = panelAudio.find((t) => t.trackType === 'sfx');

      const totalDialogueMs = dialogueTracks.reduce(
        (sum, t) => sum + t.durationMs,
        0,
      );
      const narrationMs = narrationTrack?.durationMs ?? 0;

      // Duration: max of dialogue+padding, narration+padding, or default visual duration
      const audioDurationMs =
        Math.max(totalDialogueMs, narrationMs) + 1000; // 1s padding
      const visualDurationMs = DEFAULT_PANEL_DURATION_SECONDS * 1000;
      const panelDurationMs = Math.max(audioDurationMs, visualDurationMs);
      const durationFrames = Math.ceil((panelDurationMs / 1000) * FPS);

      // Parse parallax from script
      const parallaxType =
        (scriptPanel.parallax?.background_movement
          ?.replace(/\s+/g, '_')
          .toLowerCase() as PanelData['parallax']['type']) ?? 'static';

      const panel: PanelData = {
        panelId: scriptPanel.panel_id,
        backgroundImageUrl:
          panelRecord?.backgroundImageUrl ?? '/placeholder-bg.png',
        characterLayerUrl: panelRecord?.characterLayerUrl ?? null,
        effectLayerUrl: panelRecord?.effectLayerUrl ?? null,
        durationFrames,
        parallax: {
          type: parallaxType,
          intensity: 1,
        },
        dialogue: dialogueTracks.map((track) => {
          const meta = track.metadata as Record<string, unknown> | null;
          return {
            characterId: (meta?.characterId as string) ?? '',
            text: (meta?.text as string) ?? '',
            audioUrl: track.audioUrl,
            durationMs: track.durationMs,
            tone:
              scriptPanel.dialogue.find(
                (d) => d.character_id === (meta?.characterId as string),
              )?.tone ?? 'calm',
          };
        }),
        narration: narrationTrack
          ? {
              text:
                ((narrationTrack.metadata as Record<string, unknown> | null)
                  ?.text as string) ?? '',
              audioUrl: narrationTrack.audioUrl,
              durationMs: narrationTrack.durationMs,
            }
          : null,
        sfx: sfxTrack
          ? {
              audioUrl: sfxTrack.audioUrl,
              timing:
                ((sfxTrack.metadata as Record<string, unknown> | null)
                  ?.timing as PanelData['sfx'] extends null ? never : 'start' | 'middle' | 'end') ?? 'start',
              volume:
                ((sfxTrack.metadata as Record<string, unknown> | null)
                  ?.volume as number) ?? 0.7,
            }
          : null,
        transition:
          (scriptScene.transition_to_next as PanelData['transition']) ??
          'crossfade',
      };

      return panel;
    });

    // Find music for this scene from direction
    const firstPanelDirection = directionMap.get(
      scriptScene.panels[0]?.panel_id ?? '',
    );
    let sceneMusicTrack: SceneData['musicTrack'] = null;

    if (
      firstPanelDirection?.music.action === 'change' &&
      firstPanelDirection.music.new_track_prompt
    ) {
      // Find matching music track
      const matchingMusic = musicTracks[0]; // simplified: use first available
      if (matchingMusic) {
        sceneMusicTrack = {
          audioUrl: matchingMusic.audioUrl,
          volume: firstPanelDirection.music.volume ?? 0.3,
          loop: true,
        };
      }
    }

    return {
      sceneId: scriptScene.scene_id,
      mood: scriptScene.mood,
      panels,
      musicTrack: sceneMusicTrack,
    };
  });

  // Calculate total frames
  const totalPanelFrames = scenes.reduce(
    (sum, scene) =>
      sum + scene.panels.reduce((s, p) => s + p.durationFrames, 0),
    0,
  );
  // Intro (5s) + panels + end card (15s)
  const _totalFrames = 150 + totalPanelFrames + 450;

  return {
    title: episodeTitle,
    episodeNumber,
    seriesTitle,
    scenes,
    endCard: {
      summaryPoints: script.end_card.summary_points,
      teaserNextEpisode: script.end_card.teaser_next_episode,
    },
    fps: FPS,
    width: 1920,
    height: 1080,
  };
}
