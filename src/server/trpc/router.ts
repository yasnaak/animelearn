import { router } from './init';
import { projectRouter } from './routers/project';
import { generationRouter } from './routers/generation';
import { visualsRouter } from './routers/visuals';
import { audioRouter } from './routers/audio';
import { renderRouter } from './routers/render';
import { videoRouter } from './routers/video';

export const appRouter = router({
  project: projectRouter,
  generation: generationRouter,
  visuals: visualsRouter,
  audio: audioRouter,
  render: renderRouter,
  video: videoRouter,
});

export type AppRouter = typeof appRouter;
