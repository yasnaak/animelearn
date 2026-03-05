import { router } from './init';
import { projectRouter } from './routers/project';

export const appRouter = router({
  project: projectRouter,
});

export type AppRouter = typeof appRouter;
