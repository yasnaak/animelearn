import { AbsoluteFill, Audio, Sequence } from 'remotion';
import { Shot } from './Shot';
import { EndCard } from './EndCard';
import { Transition } from './Transition';
import type { EpisodeCompositionPropsV2 } from './types';

const FPS = 30;
// Cold open: 3s
const COLD_OPEN_FRAMES = 3 * FPS;
// Title card: 3s
const TITLE_CARD_FRAMES = 3 * FPS;
// End card: 15s
const END_CARD_FRAMES = 15 * FPS;
// Transition overlap between shots within a scene
const INTRA_SCENE_TRANSITION_FRAMES = 3; // fast cuts (anime style)
// Transition overlap between scenes
const INTER_SCENE_TRANSITION_FRAMES = 15;

export const EpisodeCompositionV2: React.FC<EpisodeCompositionPropsV2> = ({
  title,
  episodeNumber,
  seriesTitle,
  coldOpen,
  scenes,
  endCard,
}) => {
  let currentFrame = 0;

  const timeline: Array<{
    type: 'cold_open' | 'title_card' | 'shot' | 'endcard';
    startFrame: number;
    durationFrames: number;
    transition: string;
    data: unknown;
  }> = [];

  // Cold open (if present)
  if (coldOpen) {
    timeline.push({
      type: 'cold_open',
      startFrame: 0,
      durationFrames: COLD_OPEN_FRAMES,
      transition: 'fade_black',
      data: { text: coldOpen },
    });
    currentFrame += COLD_OPEN_FRAMES;
  }

  // Title card
  timeline.push({
    type: 'title_card',
    startFrame: currentFrame,
    durationFrames: TITLE_CARD_FRAMES,
    transition: coldOpen ? 'fade_black' : 'cut',
    data: null,
  });
  currentFrame += TITLE_CARD_FRAMES;

  // Track scene music spans
  const musicSpans: Array<{
    startFrame: number;
    durationFrames: number;
    audioUrl: string;
    volume: number;
    loop: boolean;
  }> = [];

  // Scenes → shots
  for (let sceneIdx = 0; sceneIdx < scenes.length; sceneIdx++) {
    const scene = scenes[sceneIdx];
    const sceneStartFrame = currentFrame;

    for (let shotIdx = 0; shotIdx < scene.shots.length; shotIdx++) {
      const shot = scene.shots[shotIdx];
      const isFirstShotOfScene = shotIdx === 0;
      const transitionFrames = isFirstShotOfScene
        ? INTER_SCENE_TRANSITION_FRAMES
        : INTRA_SCENE_TRANSITION_FRAMES;

      timeline.push({
        type: 'shot',
        startFrame: currentFrame,
        durationFrames: shot.durationFrames,
        transition: isFirstShotOfScene
          ? (sceneIdx === 0 ? 'fade_black' : scene.transitionOut)
          : shot.transition,
        data: { shot, scene, shotIdx },
      });

      currentFrame += shot.durationFrames - transitionFrames;
    }

    // Scene music spans entire scene duration
    if (scene.musicTrack) {
      musicSpans.push({
        startFrame: sceneStartFrame,
        durationFrames: currentFrame - sceneStartFrame,
        audioUrl: scene.musicTrack.audioUrl,
        volume: scene.musicTrack.volume,
        loop: scene.musicTrack.loop,
      });
    }
  }

  // End card
  timeline.push({
    type: 'endcard',
    startFrame: currentFrame,
    durationFrames: END_CARD_FRAMES,
    transition: 'fade_black',
    data: null,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Cold open */}
      {coldOpen ? (
        <Sequence from={0} durationInFrames={COLD_OPEN_FRAMES}>
          <Transition type="fade_black" durationFrames={15}>
            <AbsoluteFill
              style={{
                background: 'linear-gradient(135deg, #0a0a0a, #1a1a2e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10%',
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  color: '#ccc',
                  fontFamily: "'Noto Sans', sans-serif",
                  fontStyle: 'italic',
                  textAlign: 'center',
                  lineHeight: 1.6,
                }}
              >
                {coldOpen}
              </div>
            </AbsoluteFill>
          </Transition>
        </Sequence>
      ) : null}

      {/* Title card */}
      {timeline
        .filter((t) => t.type === 'title_card')
        .map((t, i) => (
          <Sequence
            key={`title-${i}`}
            from={t.startFrame}
            durationInFrames={t.durationFrames}
          >
            <Transition type={t.transition} durationFrames={15}>
              <AbsoluteFill
                style={{
                  background:
                    'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
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
                    fontFamily:
                      "'Noto Sans JP', 'Noto Sans', sans-serif",
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
            </Transition>
          </Sequence>
        ))}

      {/* Shots */}
      {timeline
        .filter((t) => t.type === 'shot')
        .map((t) => {
          const { shot, scene, shotIdx } = t.data as {
            shot: (typeof scenes)[number]['shots'][number];
            scene: (typeof scenes)[number];
            shotIdx: number;
          };
          const isFirstShot = shotIdx === 0;
          const transitionFrames = isFirstShot
            ? INTER_SCENE_TRANSITION_FRAMES
            : INTRA_SCENE_TRANSITION_FRAMES;

          return (
            <Sequence
              key={shot.shotId}
              from={t.startFrame}
              durationInFrames={t.durationFrames}
            >
              <Transition
                type={t.transition}
                durationFrames={transitionFrames}
              >
                <Shot shot={shot} />
              </Transition>
            </Sequence>
          );
        })}

      {/* Scene music (spans entire scene, not tied to individual shots) */}
      {musicSpans.map((ms, i) => (
        <Sequence
          key={`music-${i}`}
          from={ms.startFrame}
          durationInFrames={ms.durationFrames}
        >
          <Audio
            src={ms.audioUrl}
            volume={ms.volume}
            loop={ms.loop}
          />
        </Sequence>
      ))}

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
