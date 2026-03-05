import { interpolate, useCurrentFrame } from 'remotion';

interface SubtitleEntry {
  text: string;
  startFrame: number;
  endFrame: number;
}

interface SubtitlesProps {
  entries: SubtitleEntry[];
}

export const Subtitles: React.FC<SubtitlesProps> = ({ entries }) => {
  const frame = useCurrentFrame();

  const current = entries.find(
    (e) => frame >= e.startFrame && frame <= e.endFrame,
  );

  if (!current) return null;

  const opacity = interpolate(
    frame,
    [
      current.startFrame,
      current.startFrame + 5,
      current.endFrame - 5,
      current.endFrame,
    ],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '4%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 90,
        opacity,
      }}
    >
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.75)',
          color: 'white',
          padding: '8px 24px',
          borderRadius: '6px',
          fontSize: 20,
          fontFamily: "'Noto Sans', 'Helvetica Neue', sans-serif",
          textAlign: 'center',
          maxWidth: '80vw',
          lineHeight: 1.4,
        }}
      >
        {current.text}
      </div>
    </div>
  );
};
