import { AbsoluteFill, Audio, Img, Sequence, Video } from 'remotion';
import { Subtitles } from './Subtitles';
import type { ShotData } from './types';

interface ShotProps {
  shot: ShotData;
}

export const Shot: React.FC<ShotProps> = ({ shot }) => {
  const { durationFrames } = shot;
  const FPS = 30;

  // Calculate dialogue timing
  let audioOffset = 10; // small padding before dialogue starts
  const subtitleEntries: Array<{
    text: string;
    startFrame: number;
    endFrame: number;
  }> = [];

  const dialogueSequences = shot.dialogue.map((line) => {
    const startFrame = audioOffset;
    const lineDurationFrames = Math.ceil((line.durationMs / 1000) * FPS);
    audioOffset += lineDurationFrames + 4;

    subtitleEntries.push({
      text: `${line.characterName}: ${line.text}`,
      startFrame,
      endFrame: Math.min(startFrame + lineDurationFrames, durationFrames),
    });

    return { ...line, startFrame, lineDurationFrames };
  });

  // Narration timing (after dialogue)
  const narrationStart = audioOffset + 6;
  if (shot.narration) {
    const narrationDuration = Math.ceil(
      (shot.narration.durationMs / 1000) * FPS,
    );
    subtitleEntries.push({
      text: shot.narration.text,
      startFrame: narrationStart,
      endFrame: Math.min(narrationStart + narrationDuration, durationFrames),
    });
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Video clip (primary) — fallback to still image — fallback to placeholder */}
      {shot.videoUrl ? (
        <AbsoluteFill>
          <Video
            src={shot.videoUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </AbsoluteFill>
      ) : shot.fallbackImageUrl ? (
        <AbsoluteFill>
          <Img
            src={shot.fallbackImageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            backgroundColor: '#111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ color: '#444', fontSize: 18, fontFamily: "'Noto Sans', sans-serif" }}>
            Shot {shot.shotId}
          </div>
        </AbsoluteFill>
      )}

      {/* Dialogue audio */}
      {dialogueSequences.map((line, i) => (
        <Sequence
          key={`${shot.shotId}-audio-${i}`}
          from={line.startFrame}
          durationInFrames={line.lineDurationFrames}
        >
          <Audio src={line.audioUrl} volume={1.0} />
        </Sequence>
      ))}

      {/* Narration audio */}
      {shot.narration ? (
        <Sequence
          from={narrationStart}
          durationInFrames={Math.ceil(
            (shot.narration.durationMs / 1000) * FPS,
          )}
        >
          <Audio src={shot.narration.audioUrl} volume={0.9} />
        </Sequence>
      ) : null}

      {/* SFX */}
      {shot.sfx ? (() => {
        const sfxStart =
          shot.sfx.timing === 'start'
            ? 0
            : shot.sfx.timing === 'middle'
              ? Math.floor(durationFrames / 2)
              : Math.max(0, durationFrames - FPS);
        const sfxMaxDuration = Math.max(1, durationFrames - sfxStart);
        return (
          <Sequence
            from={sfxStart}
            durationInFrames={Math.min(FPS * 3, sfxMaxDuration)}
          >
            <Audio src={shot.sfx.audioUrl} volume={shot.sfx.volume} />
          </Sequence>
        );
      })() : null}

      {/* Subtitles (anime-style at bottom) */}
      <Subtitles entries={subtitleEntries} />
    </AbsoluteFill>
  );
};
