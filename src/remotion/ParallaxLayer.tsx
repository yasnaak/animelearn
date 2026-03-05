import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';

interface ParallaxLayerProps {
  imageUrl: string;
  depth: 1 | 2 | 3; // 1=background, 2=characters, 3=effects
  movement: string;
  durationFrames: number;
  intensity?: number;
}

const DEPTH_MULTIPLIER = { 1: 0.3, 2: 0.6, 3: 1.0 };

export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({
  imageUrl,
  depth,
  movement,
  durationFrames,
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const mult = DEPTH_MULTIPLIER[depth] * intensity;

  let translateX = 0;
  let translateY = 0;
  let scale = 1.1; // 10% oversized to allow movement without edges

  switch (movement) {
    case 'slow_pan_left':
      translateX = interpolate(frame, [0, durationFrames], [0, -30 * mult], {
        extrapolateRight: 'clamp',
      });
      break;
    case 'slow_pan_right':
      translateX = interpolate(frame, [0, durationFrames], [0, 30 * mult], {
        extrapolateRight: 'clamp',
      });
      break;
    case 'zoom_in':
      scale = interpolate(frame, [0, durationFrames], [1.0, 1.08 * mult + 1], {
        extrapolateRight: 'clamp',
      });
      break;
    case 'zoom_out':
      scale = interpolate(frame, [0, durationFrames], [1.15, 1.0], {
        extrapolateRight: 'clamp',
      });
      break;
    case 'float':
      translateY =
        Math.sin((frame / durationFrames) * Math.PI * 2) * 8 * mult;
      break;
    case 'shake':
      translateX = Math.sin(frame * 0.8) * 3 * mult;
      translateY = Math.cos(frame * 0.6) * 2 * mult;
      break;
    case 'dramatic_zoom':
      scale = interpolate(frame, [0, durationFrames], [1.0, 1.25 * mult], {
        extrapolateRight: 'clamp',
      });
      break;
    case 'static':
    default:
      // Ken Burns effect for static panels
      scale = interpolate(frame, [0, durationFrames], [1.0, 1.04], {
        extrapolateRight: 'clamp',
      });
      break;
  }

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Img
        src={imageUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </AbsoluteFill>
  );
};
