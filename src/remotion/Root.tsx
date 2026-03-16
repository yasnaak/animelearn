import { Composition } from 'remotion';
import { EpisodeComposition } from './EpisodeComposition';
import { EpisodeCompositionV2 } from './EpisodeCompositionV2';
import type { EpisodeCompositionProps, EpisodeCompositionPropsV2 } from './types';

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

const defaultProps: EpisodeCompositionProps = {
  title: 'Preview Episode',
  episodeNumber: 1,
  seriesTitle: 'AnimeForge',
  scenes: [],
  endCard: {
    summaryPoints: ['Point 1', 'Point 2', 'Point 3'],
    teaserNextEpisode: null,
  },
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
};

const defaultPropsV2: EpisodeCompositionPropsV2 = {
  title: 'Preview Episode',
  episodeNumber: 1,
  seriesTitle: 'AnimeForge',
  coldOpen: null,
  scenes: [],
  endCard: {
    summaryPoints: ['Point 1', 'Point 2', 'Point 3'],
    teaserNextEpisode: null,
  },
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Episode"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={EpisodeComposition as any}
        durationInFrames={30 * 240}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={defaultProps}
      />
      <Composition
        id="EpisodeV2"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={EpisodeCompositionV2 as any}
        durationInFrames={30 * 300}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={defaultPropsV2}
      />
    </>
  );
};
