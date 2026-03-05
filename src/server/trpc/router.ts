import { router } from './init';
import { projectRouter } from './routers/project';
import { generationRouter } from './routers/generation';
import { visualsRouter } from './routers/visuals';
import { audioRouter } from './routers/audio';
import { renderRouter } from './routers/render';

export const appRouter = router({
  project: projectRouter,
  generation: generationRouter,
  visuals: visualsRouter,
  audio: audioRouter,
  render: renderRouter,
});

export type AppRouter = typeof appRouter;
