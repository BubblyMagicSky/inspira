import { router } from './trpc';
import { feedRouter } from './routers/feed';

export const appRouter = router({
  feed: feedRouter,
});

export type AppRouter = typeof appRouter;
