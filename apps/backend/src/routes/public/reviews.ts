// Public Reviews Routes - View product reviews
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { reviewService } from '../../services/review.service.js';

const listQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});

export default async function publicReviewsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/public/reviews/product/:id - Get reviews for a product
  fastify.get('/product/:id', async (request) => {
    if (!request.storeId) {
      return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
    const { id } = idParamSchema.parse(request.params);
    const query = listQuerySchema.parse(request.query);
    const result = await reviewService.findByProductId(id, request.storeId, query);
    return result;
  });
}