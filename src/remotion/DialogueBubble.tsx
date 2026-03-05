import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface DialogueBubbleProps {
  text: string;
  position: 'left' | 'center' | 'right';
  tone: string;
  startFrame: number;
  durationFrames: number;
}

export const DialogueBubble: React.FC<DialogueBubbleProps> = ({
  text,
  position,
  tone,
  startFrame,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;
  if (localFrame < 0 || localFrame > durationFrames) return null;

  // Spring entrance
  const scaleIn = spring({
    frame: localFrame,
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  // Fade out in last 10 frames
  const fadeOut = interpolate(
    localFrame,
    [durationFrames - 10, durationFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const positionStyle: React.CSSProperties = {
    left: position === 'left' ? '5%' : position === 'center' ? '25%' : undefined,
    right: position === 'right' ? '5%' : undefined,
    bottom: '12%',
    maxWidth: '50%',
  };

  // Bubble style variants based on tone
  const isShout = tone === 'shout' || tone === 'angry';
  const isWhisper = tone === 'whisper';
  const isThought = tone === 'sarcastic';

  const borderStyle = isWhisper
    ? '2px dashed #333'
    : isShout
      ? '3px solid #c00'
      : '2px solid #333';

  const borderRadius = isThought ? '50%' : isShout ? '8px' : '16px';

  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyle,
        transform: `scale(${scaleIn})`,
        opacity: fadeOut,
        zIndex: 80,
      }}
    >
      <div
        style={{
          background: 'white',
          border: borderStyle,
          borderRadius,
          padding: '12px 18px',
          fontSize: isShout ? 22 : isWhisper ? 16 : 18,
          fontFamily: "'Noto Sans JP', 'Helvetica Neue', sans-serif",
          fontWeight: isShout ? 700 : 400,
          fontStyle: isWhisper ? 'italic' : 'normal',
          color: '#1a1a1a',
          lineHeight: 1.4,
          boxShadow: '2px 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        {text}
      </div>
    </div>
  );
};
