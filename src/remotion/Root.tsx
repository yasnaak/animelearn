import { Composition } from 'remotion';
import { EpisodeComposition } from './EpisodeComposition';
import type { EpisodeCompositionProps } from './types';

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

const defaultProps: EpisodeCompositionProps = {
  title: 'Preview Episode',
  episodeNumber: 1,
  seriesTitle: 'AnimeLearn',
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
    </>
  );
};
