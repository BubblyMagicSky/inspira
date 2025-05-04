import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import request from 'supertest';
import { appRouter } from '../../src/trpc/router';
import { createContext } from '../../src/trpc/context';
import axios from 'axios';
import { spawn } from 'child_process';
import { AddressInfo } from 'net';
import path from 'path';
import { xprocess } from 'xprocess';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Feed Router Integration Tests', () => {
  let app: express.Application;
  let recsysProcess: any;
  let recsysUrl: string;

  beforeAll(async () => {
    recsysProcess = await xprocess.start('recsys', {
      command: 'python',
      args: ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '0'],
      cwd: path.resolve(__dirname, '../../../recsys'),
      env: {
        ...process.env,
        PYTHONPATH: path.resolve(__dirname, '../../../recsys'),
      },
      readyWhen: (stdout) => stdout.includes('Application startup complete'),
      extractPort: (stdout) => {
        const match = stdout.match(/Uvicorn running on http:\/\/127\.0\.0\.1:(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      },
    });

    recsysUrl = `http://127.0.0.1:${recsysProcess.port}`;
    process.env.RECSYS_API_URL = recsysUrl;

    app = express();
    app.use(
      '/trpc',
      createExpressMiddleware({
        router: appRouter,
        createContext,
      }),
    );
  });

  afterAll(async () => {
    await xprocess.stop('recsys');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecommendations', () => {
    it('should return recommendations for a user', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          recommendations: [
            { item_id: 'item1', score: 0.9 },
            { item_id: 'item2', score: 0.8 },
          ],
          user_id: 'user123',
          limit: 10,
        },
      });

      const response = await request(app)
        .get('/trpc/feed.getRecommendations?input=%7B%22userId%22%3A%22user123%22%2C%22limit%22%3A10%7D')
        .expect(200);

      const result = JSON.parse(response.text);

      expect(result.result.data).toEqual({
        recommendations: [
          { itemId: 'item1', score: 0.9 },
          { itemId: 'item2', score: 0.8 },
        ],
        userId: 'user123',
        limit: 10,
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${recsysUrl}/api/recommendations?user_id=user123&limit=10`,
      );
    });

    it('should handle errors from the recommendation system', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            detail: 'No items found for user nonexistent',
          },
        },
      });

      const response = await request(app)
        .get('/trpc/feed.getRecommendations?input=%7B%22userId%22%3A%22nonexistent%22%2C%22limit%22%3A10%7D')
        .expect(200);

      const result = JSON.parse(response.text);

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('NOT_FOUND');
      expect(result.error.message).toBe('No recommendations found for user nonexistent');
    });

    it('should retry on temporary failures', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce({
          data: {
            recommendations: [{ item_id: 'item1', score: 0.9 }],
            user_id: 'user123',
            limit: 10,
          },
        });

      const response = await request(app)
        .get('/trpc/feed.getRecommendations?input=%7B%22userId%22%3A%22user123%22%2C%22limit%22%3A10%7D')
        .expect(200);

      const result = JSON.parse(response.text);

      expect(result.result.data).toEqual({
        recommendations: [{ itemId: 'item1', score: 0.9 }],
        userId: 'user123',
        limit: 10,
      });

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should include item IDs in the request if provided', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          recommendations: [{ item_id: 'item3', score: 0.7 }],
          user_id: 'user123',
          limit: 5,
        },
      });

      const response = await request(app)
        .get(
          '/trpc/feed.getRecommendations?input=%7B%22userId%22%3A%22user123%22%2C%22limit%22%3A5%2C%22itemIds%22%3A%5B%22item1%22%2C%22item2%22%5D%7D',
        )
        .expect(200);

      const result = JSON.parse(response.text);

      expect(result.result.data).toEqual({
        recommendations: [{ itemId: 'item3', score: 0.7 }],
        userId: 'user123',
        limit: 5,
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${recsysUrl}/api/recommendations?user_id=user123&limit=5&item_ids=item1&item_ids=item2`,
      );
    });
  });
});
