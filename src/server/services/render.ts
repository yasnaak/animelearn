import type {
  EpisodeCompositionProps,
  EpisodeCompositionPropsV2,
  PanelData,
  SceneData,
  SceneDataV2,
  ShotData,
} from '@/remotion/types';
import type {
  EpisodeScript,
  AudioDirection,
  AudioDirectionV2,
  Screenplay,
  SeriesPlan,
} from './ai-pipeline';

const FPS = 30;
const DEFAULT_PANEL_DURATION_SECONDS = 3.5;

interface PanelRecord {
  panelId: string;
  backgroundImageUrl: string | null;
  characterLayerUrl: string | null;
  effectLayerUrl: string | null;
  videoUrl: string | null;
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
        videoUrl: panelRecord?.videoUrl ?? null,
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
      summaryPoints: script.end_card.call_to_action,
      teaserNextEpisode: script.end_card.teaser_next_episode,
    },
    fps: FPS,
    width: 1920,
    height: 1080,
  };
}

// ============================================================
// V2: SHOT-BASED ASSEMBLY
// ============================================================

interface ShotRecord {
  shotId: string;
  sceneId: string;
  shotType: string;
  referenceImageUrl: string | null;
  videoUrl: string | null;
  durationSeconds: number;
  metadata: unknown;
}

interface AudioTrackRecordV2 {
  trackType: string;
  audioUrl: string;
  durationMs: number;
  shotId: string | null;
  metadata: unknown;
}

/**
 * Assembles shot-based episode data into V2 Remotion composition props
 */
export function assembleEpisodePropsV2(params: {
  episodeNumber: number;
  episodeTitle: string;
  seriesTitle: string;
  screenplay: Screenplay;
  audioDirection: AudioDirectionV2;
  shotRecords: ShotRecord[];
  audioTrackRecords: AudioTrackRecordV2[];
}): EpisodeCompositionPropsV2 {
  const {
    episodeNumber,
    episodeTitle,
    seriesTitle,
    screenplay,
    audioDirection,
    shotRecords,
    audioTrackRecords,
  } = params;

  // Index shots and audio by shotId
  const shotMap = new Map(shotRecords.map((s) => [s.shotId, s]));
  const audioByShot = new Map<string, AudioTrackRecordV2[]>();
  const musicTracks: AudioTrackRecordV2[] = [];

  for (const track of audioTrackRecords) {
    if (track.trackType === 'music') {
      musicTracks.push(track);
    } else if (track.shotId) {
      const existing = audioByShot.get(track.shotId) ?? [];
      existing.push(track);
      audioByShot.set(track.shotId, existing);
    }
  }

  // Map audio direction entries by shot_id
  const directionMap = new Map(
    audioDirection.audio_timeline.map((entry) => [entry.shot_id, entry]),
  );

  let musicTrackIdx = 0;

  // Build scenes from screenplay acts → scenes
  const scenes: SceneDataV2[] = screenplay.acts.flatMap((act) =>
    act.scenes.map((screenplayScene) => {
      // Flatten beats → shots
      const shots: ShotData[] = screenplayScene.beats.flatMap((beat) =>
        beat.shots.map((screenplayShot) => {
          const shotRecord = shotMap.get(screenplayShot.shot_id);
          const shotAudio =
            audioByShot.get(screenplayShot.shot_id) ?? [];

          const dialogueTracks = shotAudio.filter(
            (t) => t.trackType === 'dialogue',
          );
          const narrationTrack = shotAudio.find(
            (t) => t.trackType === 'narration',
          );
          const sfxTrack = shotAudio.find((t) => t.trackType === 'sfx');

          // Duration: use screenplay's duration_seconds, min 3s
          const durationSeconds = shotRecord?.durationSeconds ?? screenplayShot.duration_seconds;
          const totalDialogueMs = dialogueTracks.reduce(
            (sum, t) => sum + t.durationMs,
            0,
          );
          const narrationMs = narrationTrack?.durationMs ?? 0;
          const audioDurationMs = Math.max(totalDialogueMs, narrationMs) + 500;
          const visualDurationMs = durationSeconds * 1000;
          const durationFrames = Math.ceil(
            (Math.max(audioDurationMs, visualDurationMs) / 1000) * FPS,
          );

          const shot: ShotData = {
            shotId: screenplayShot.shot_id,
            shotType: screenplayShot.shot_type,
            videoUrl: shotRecord?.videoUrl ?? '',
            fallbackImageUrl:
              shotRecord?.referenceImageUrl ?? '/placeholder-bg.png',
            durationFrames,
            camera: {
              movement: screenplayShot.camera.movement,
              intensity: 1,
            },
            dialogue: dialogueTracks.map((track) => {
              const meta = track.metadata as Record<string, unknown> | null;
              const direction = directionMap.get(screenplayShot.shot_id);
              const dirDialogue = direction?.dialogue.find(
                (d) =>
                  d.character_id ===
                  (meta?.characterId as string),
              );

              return {
                characterId: (meta?.characterId as string) ?? '',
                characterName: (meta?.characterName as string) ?? dirDialogue?.character_name ?? '',
                text: (meta?.text as string) ?? '',
                audioUrl: track.audioUrl,
                durationMs: track.durationMs,
                delivery: dirDialogue?.delivery ?? 'calm',
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
                      ?.timing as 'start' | 'middle' | 'end') ?? 'start',
                  volume:
                    ((sfxTrack.metadata as Record<string, unknown> | null)
                      ?.volume as number) ?? 0.7,
                }
              : null,
            transition: screenplayShot.transition as ShotData['transition'],
          };

          return shot;
        }),
      );

      // Check if this scene needs a music change
      const firstShotDirection = directionMap.get(
        screenplayScene.beats[0]?.shots[0]?.shot_id ?? '',
      );
      let sceneMusicTrack: SceneDataV2['musicTrack'] = null;

      if (
        firstShotDirection?.music.action === 'change' &&
        musicTracks[musicTrackIdx]
      ) {
        sceneMusicTrack = {
          audioUrl: musicTracks[musicTrackIdx].audioUrl,
          volume: firstShotDirection.music.volume ?? 0.3,
          loop: true,
        };
        musicTrackIdx++;
      } else if (musicTrackIdx === 0 && musicTracks[0]) {
        // First scene gets the first music track
        sceneMusicTrack = {
          audioUrl: musicTracks[0].audioUrl,
          volume: 0.3,
          loop: true,
        };
        musicTrackIdx = 1;
      }

      return {
        sceneId: screenplayScene.scene_id,
        mood: screenplayScene.mood,
        shots,
        musicTrack: sceneMusicTrack,
        transitionOut: screenplayScene.transition_out as SceneDataV2['transitionOut'],
      };
    }),
  );

  return {
    title: episodeTitle,
    episodeNumber,
    seriesTitle,
    coldOpen: screenplay.episode.cold_open,
    scenes,
    endCard: {
      summaryPoints: screenplay.end_card.call_to_action,
      teaserNextEpisode: screenplay.end_card.teaser_next_episode,
    },
    fps: FPS,
    width: 1920,
    height: 1080,
  };
}
