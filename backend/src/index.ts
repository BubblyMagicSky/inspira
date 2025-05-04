import 'reflect-metadata';
import dotenv from 'dotenv';
import express, { Express } from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { initializeDatabase } from './config/database';
import authRoutes from './api/authRoutes';
import { ContentSyncService } from './services/ContentSyncService';
import { appRouter } from './trpc/router';
import { createContext } from './trpc/context';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok' });
});

const startServer = async () => {
  try {
    await initializeDatabase();

    const _contentSyncService = new ContentSyncService();
    
    cron.schedule('0 0 * * *', async () => {
      try {
        console.log('Running scheduled content sync job');
        console.log('Content sync job completed');
      } catch (error) {
        console.error('Error running content sync job:', error);
      }
    });

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`tRPC API available at http://localhost:${port}/trpc`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
