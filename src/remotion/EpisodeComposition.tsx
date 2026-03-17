import { AbsoluteFill, Audio, Sequence } from 'remotion';
import { Panel } from './Panel';
import { EndCard } from './EndCard';
import { Transition } from './Transition';
import type { EpisodeCompositionProps } from './types';

// Intro duration: 5s at 30fps = 150 frames
const INTRO_FRAMES = 150;
// End card: 15s = 450 frames
const END_CARD_FRAMES = 450;
// Transition overlap between panels
const TRANSITION_FRAMES = 15;

export const EpisodeComposition: React.FC<EpisodeCompositionProps> = ({
  title,
  episodeNumber,
  seriesTitle,
  scenes,
  endCard,
}) => {
  let currentFrame = 0;

  // Build timeline
  const timeline: Array<{
    type: 'intro' | 'panel' | 'endcard';
    startFrame: number;
    durationFrames: number;
    data: unknown;
  }> = [];

  // Intro
  timeline.push({
    type: 'intro',
    startFrame: 0,
    durationFrames: INTRO_FRAMES,
    data: null,
  });
  currentFrame += INTRO_FRAMES;

  // Scenes and panels
  for (const scene of scenes) {
    for (let i = 0; i < scene.panels.length; i++) {
      const panel = scene.panels[i];
      timeline.push({
        type: 'panel',
        startFrame: currentFrame,
        durationFrames: panel.durationFrames,
        data: { panel, scene, panelIndex: i },
      });
      currentFrame += panel.durationFrames - TRANSITION_FRAMES;
    }
  }

  // End card
  timeline.push({
    type: 'endcard',
    startFrame: currentFrame,
    durationFrames: END_CARD_FRAMES,
    data: null,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Intro */}
      <Sequence from={0} durationInFrames={INTRO_FRAMES}>
        <AbsoluteFill
          style={{
            background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: '#888',
              fontFamily: "'Noto Sans', sans-serif",
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            {seriesTitle}
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#fff',
              fontFamily: "'Noto Sans JP', 'Noto Sans', sans-serif",
              textAlign: 'center',
            }}
          >
            Episode {episodeNumber}
          </div>
          <div
            style={{
              fontSize: 28,
              color: '#ccc',
              fontFamily: "'Noto Sans', sans-serif",
              fontStyle: 'italic',
            }}
          >
            {title}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 30,
              fontSize: 14,
              color: '#555',
              fontFamily: "'Noto Sans', sans-serif",
            }}
          >
            Drawnema
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Panels */}
      {timeline
        .filter((t) => t.type === 'panel')
        .map((t) => {
          const { panel, scene, panelIndex } = t.data as {
            panel: (typeof scenes)[number]['panels'][number];
            scene: (typeof scenes)[number];
            panelIndex: number;
          };

          return (
            <Sequence
              key={panel.panelId}
              from={t.startFrame}
              durationInFrames={t.durationFrames}
            >
              <Transition
                type={panelIndex === 0 ? 'fade_black' : panel.transition}
                durationFrames={TRANSITION_FRAMES}
              >
                <Panel panel={panel} />
              </Transition>

              {/* Scene music (on first panel of scene) */}
              {panelIndex === 0 && scene.musicTrack ? (
                <Audio
                  src={scene.musicTrack.audioUrl}
                  volume={scene.musicTrack.volume}
                  loop={scene.musicTrack.loop}
                />
              ) : null}
            </Sequence>
          );
        })}

      {/* End Card */}
      {timeline
        .filter((t) => t.type === 'endcard')
        .map((t, i) => (
          <Sequence
            key={`endcard-${i}`}
            from={t.startFrame}
            durationInFrames={t.durationFrames}
          >
            <Transition type="fade_black" durationFrames={30}>
              <EndCard
                summaryPoints={endCard.summaryPoints}
                teaserNextEpisode={endCard.teaserNextEpisode}
                seriesTitle={seriesTitle}
              />
            </Transition>
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};
