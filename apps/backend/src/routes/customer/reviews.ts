// Customer Reviews Routes - Create and manage product reviews
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { reviewService } from '../../services/review.service.js';

const createReviewSchema = z.strictObject({
  productId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  content: z.string().min(1).max(2000),
  images: z.string().optional(),
});

const updateReviewSchema = z.strictObject({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(255).optional(),
  content: z.string().min(1).max(2000).optional(),
  images: z.string().optional(),
});

const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});

export default async function customerReviewsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/customer/reviews - List customer's reviews
  fastify.get('/', async (request) => {
    const result = await reviewService.findByStoreId(request.storeId, { page: 1, limit: 100 });
    // Filter to only show this customer's reviews
    const customerReviews = result.data.filter((r: { customerId: string | null }) =>
      r.customerId === request.customerId,
    );
    return { reviews: customerReviews };
  });

  // POST /api/v1/customer/reviews - Create a review
  fastify.post('/', async (request, reply) => {
    const parsed = createReviewSchema.parse(request.body);
    const review = await reviewService.create({
      storeId: request.storeId,
      productId: parsed.productId,
      customerId: request.customerId,
      orderId: parsed.orderId,
      rating: parsed.rating,
      title: parsed.title,
      content: parsed.content,
      images: parsed.images,
    });
    reply.status(201).send({ review });
  });

  // PATCH /api/v1/customer/reviews/:id - Update own review
  fastify.patch('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateReviewSchema.parse(request.body);
    const review = await reviewService.update(id, request.storeId, parsed);
    return { review };
  });

  // DELETE /api/v1/customer/reviews/:id - Delete own review
  fastify.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await reviewService.delete(id, request.storeId);
    reply.status(204).send();
  });
}