import { router } from './init';
import { projectRouter } from './routers/project';
import { generationRouter } from './routers/generation';
import { visualsRouter } from './routers/visuals';
import { audioRouter } from './routers/audio';
import { renderRouter } from './routers/render';
import { videoRouter } from './routers/video';
import { learningRouter } from './routers/learning';
import { billingRouter } from './routers/billing';

export const appRouter = router({
  project: projectRouter,
  generation: generationRouter,
  visuals: visualsRouter,
  audio: audioRouter,
  render: renderRouter,
  video: videoRouter,
  learning: learningRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
