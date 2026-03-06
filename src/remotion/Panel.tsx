import { AbsoluteFill, Audio, Sequence, Video } from 'remotion';
import { ParallaxLayer } from './ParallaxLayer';
import { DialogueBubble } from './DialogueBubble';
import { Subtitles } from './Subtitles';
import type { PanelData } from './types';

interface PanelProps {
  panel: PanelData;
}

export const Panel: React.FC<PanelProps> = ({ panel }) => {
  const { durationFrames } = panel;

  // Calculate dialogue timing
  let dialogueOffset = 15; // 0.5s padding before dialogue starts (at 30fps)
  const subtitleEntries: Array<{
    text: string;
    startFrame: number;
    endFrame: number;
  }> = [];

  const dialogueSequences = panel.dialogue.map((line) => {
    const startFrame = dialogueOffset;
    const lineDurationFrames = Math.ceil((line.durationMs / 1000) * 30);
    dialogueOffset += lineDurationFrames + 6; // small gap between lines

    subtitleEntries.push({
      text: line.text,
      startFrame,
      endFrame: startFrame + lineDurationFrames,
    });

    return { ...line, startFrame, lineDurationFrames };
  });

  // Narration timing (after dialogue)
  const narrationStart = dialogueOffset + 10;
  if (panel.narration) {
    const narrationDuration = Math.ceil(
      (panel.narration.durationMs / 1000) * 30,
    );
    subtitleEntries.push({
      text: panel.narration.text,
      startFrame: narrationStart,
      endFrame: narrationStart + narrationDuration,
    });
  }

  // Determine if this panel uses a video clip or static layers
  const hasVideo = !!panel.videoUrl;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {hasVideo ? (
        /* ── Video clip mode (LTX-2.3) ── */
        <AbsoluteFill>
          <Video
            src={panel.videoUrl!}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </AbsoluteFill>
      ) : (
        /* ── Static image layers mode (fal.ai + parallax) ── */
        <>
          {/* Layer 1: Background */}
          <ParallaxLayer
            imageUrl={panel.backgroundImageUrl}
            depth={1}
            movement={panel.parallax.type}
            durationFrames={durationFrames}
            intensity={panel.parallax.intensity}
          />

          {/* Layer 2: Characters */}
          {panel.characterLayerUrl ? (
            <ParallaxLayer
              imageUrl={panel.characterLayerUrl}
              depth={2}
              movement={panel.parallax.type}
              durationFrames={durationFrames}
              intensity={panel.parallax.intensity}
            />
          ) : null}

          {/* Layer 3: Effects */}
          {panel.effectLayerUrl ? (
            <ParallaxLayer
              imageUrl={panel.effectLayerUrl}
              depth={3}
              movement={panel.parallax.type}
              durationFrames={durationFrames}
              intensity={panel.parallax.intensity}
            />
          ) : null}
        </>
      )}

      {/* Dialogue bubbles (overlaid on both video and static modes) */}
      {dialogueSequences.map((line, i) => (
        <DialogueBubble
          key={`${panel.panelId}-dialogue-${i}`}
          text={line.text}
          position={i % 2 === 0 ? 'left' : 'right'}
          tone={line.tone}
          startFrame={line.startFrame}
          durationFrames={line.lineDurationFrames}
        />
      ))}

      {/* Dialogue audio */}
      {dialogueSequences.map((line, i) => (
        <Sequence
          key={`${panel.panelId}-audio-${i}`}
          from={line.startFrame}
          durationInFrames={line.lineDurationFrames}
        >
          <Audio src={line.audioUrl} volume={1.0} />
        </Sequence>
      ))}

      {/* Narration audio */}
      {panel.narration ? (
        <Sequence
          from={narrationStart}
          durationInFrames={Math.ceil(
            (panel.narration.durationMs / 1000) * 30,
          )}
        >
          <Audio src={panel.narration.audioUrl} volume={0.9} />
        </Sequence>
      ) : null}

      {/* SFX */}
      {panel.sfx ? (
        <Sequence
          from={
            panel.sfx.timing === 'start'
              ? 0
              : panel.sfx.timing === 'middle'
                ? Math.floor(durationFrames / 2)
                : durationFrames - 30
          }
        >
          <Audio src={panel.sfx.audioUrl} volume={panel.sfx.volume} />
        </Sequence>
      ) : null}

      {/* Subtitles */}
      <Subtitles entries={subtitleEntries} />
    </AbsoluteFill>
  );
};
