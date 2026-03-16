import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

interface TransitionProps {
  type: string;
  durationFrames: number;
  children: React.ReactNode;
}

export const Transition: React.FC<TransitionProps> = ({
  type,
  durationFrames,
  children,
}) => {
  const frame = useCurrentFrame();

  let opacity = 1;
  let transform = 'none';

  switch (type) {
    case 'fade_black':
      opacity = interpolate(frame, [0, durationFrames], [0, 1], {
        extrapolateRight: 'clamp',
      });
      break;
    case 'fade_white':
      opacity = interpolate(frame, [0, durationFrames], [0, 1], {
        extrapolateRight: 'clamp',
      });
      break;
    case 'swipe_left':
      transform = `translateX(${interpolate(
        frame,
        [0, durationFrames],
        [100, 0],
        { extrapolateRight: 'clamp' },
      )}%)`;
      break;
    case 'crossfade':
      opacity = interpolate(frame, [0, durationFrames], [0, 1], {
        extrapolateRight: 'clamp',
      });
      break;
    case 'dissolve':
      opacity = interpolate(frame, [0, durationFrames], [0, 1], {
        extrapolateRight: 'clamp',
      });
      break;
    case 'zoom_out': {
      const scale = interpolate(frame, [0, durationFrames], [1.3, 1.0], {
        extrapolateRight: 'clamp',
      });
      opacity = interpolate(frame, [0, durationFrames / 2], [0, 1], {
        extrapolateRight: 'clamp',
      });
      transform = `scale(${scale})`;
      break;
    }
    case 'whip_pan':
      transform = `translateX(${interpolate(
        frame,
        [0, durationFrames * 0.4, durationFrames],
        [100, -5, 0],
        { extrapolateRight: 'clamp' },
      )}%)`;
      opacity = interpolate(frame, [0, durationFrames * 0.3], [0.3, 1], {
        extrapolateRight: 'clamp',
      });
      break;
    case 'match_cut':
      // Instant cut — no transition, full opacity from frame 0
      opacity = 1;
      break;
    case 'smash_cut':
      // Brief blackout then snap to content
      opacity = frame < 1 ? 0 : 1;
      break;
    default: // 'cut'
      break;
  }

  return (
    <AbsoluteFill style={{ opacity, transform }}>
      {children}
      {type === 'smash_cut' && frame < 3 && (
        <AbsoluteFill
          style={{
            backgroundColor: '#fff',
            opacity: interpolate(frame, [0, 3], [0.9, 0], {
              extrapolateRight: 'clamp',
            }),
          }}
        />
      )}
    </AbsoluteFill>
  );
};
