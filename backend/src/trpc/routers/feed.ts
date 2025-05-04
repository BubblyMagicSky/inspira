import { z } from 'zod';
import axios from 'axios';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../trpc';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 300;

const RecommendationScoreSchema = z.object({
  item_id: z.string(),
  score: z.number(),
});

const RecommendationResponseSchema = z.object({
  recommendations: z.array(RecommendationScoreSchema),
  user_id: z.string(),
  limit: z.number(),
});

/**
 * Helper function to implement retry with exponential backoff
 */
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  retries = MAX_RETRIES,
  backoff = INITIAL_BACKOFF_MS,
): Promise<T> {
  try {
    return await fetchFn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    console.log(`Request failed, retrying in ${backoff}ms... (${retries} retries left)`);
    
    await new Promise((resolve) => setTimeout(resolve, backoff));
    
    return fetchWithRetry(fetchFn, retries - 1, backoff * 2);
  }
}

export const feedRouter = router({
  /**
   * Get recommendations for a user
   */
  getRecommendations: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(1).max(50).default(10),
        itemIds: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ input }) => {
      const { userId, limit, itemIds } = input;
      const recsysApiUrl = process.env.RECSYS_API_URL || 'http://localhost:8000';
      
      try {
        let url = `${recsysApiUrl}/api/recommendations?user_id=${userId}&limit=${limit}`;
        
        if (itemIds && itemIds.length > 0) {
          itemIds.forEach((itemId) => {
            url += `&item_ids=${itemId}`;
          });
        }
        
        const response = await fetchWithRetry(async () => {
          const res = await axios.get(url);
          return res.data;
        });
        
        const validatedResponse = RecommendationResponseSchema.parse(response);
        
        return {
          recommendations: validatedResponse.recommendations.map((rec) => ({
            itemId: rec.item_id,
            score: rec.score,
          })),
          userId: validatedResponse.user_id,
          limit: validatedResponse.limit,
        };
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `No recommendations found for user ${userId}`,
          });
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch recommendations from recommendation service',
          cause: error,
        });
      }
    }),
});
