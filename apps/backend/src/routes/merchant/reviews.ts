// Merchant Reviews Routes - Review listing, moderation, response
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

const respondSchema = z.strictObject({
  response: z.string().min(1).max(2000),
});

const approveSchema = z.strictObject({
  isApproved: z.boolean(),
});

export default async function merchantReviewsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/reviews - list all reviews for store
  fastify.get('/', {
    schema: {
      tags: ['Merchant Reviews'],
      summary: 'List reviews',
      description: 'List all reviews for the authenticated merchant store with pagination',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await reviewService.findByStoreId(request.storeId, query);
    return result;
  });

  // GET /api/v1/merchant/reviews/:id
  fastify.get('/:id', {
    schema: {
      tags: ['Merchant Reviews'],
      summary: 'Get review detail',
      description: 'Retrieve a single review by ID for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const review = await reviewService.findById(id, request.storeId);
    return { review };
  });

  // PATCH /api/v1/merchant/reviews/:id/approve - approve/reject review
  fastify.patch('/:id/approve', {
    schema: {
      tags: ['Merchant Reviews'],
      summary: 'Approve or reject review',
      description: 'Update the approval status of a review in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = approveSchema.parse(request.body);
    const review = await reviewService.update(id, request.storeId, {
      isApproved: parsed.isApproved,
    });
    return { review };
  });

  // POST /api/v1/merchant/reviews/:id/respond - respond to review
  fastify.post('/:id/respond', {
    schema: {
      tags: ['Merchant Reviews'],
      summary: 'Respond to review',
      description: 'Submit a merchant response to a customer review',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = respondSchema.parse(request.body);
    const review = await reviewService.update(id, request.storeId, {
      response: parsed.response,
    });
    return { review };
  });

  // DELETE /api/v1/merchant/reviews/:id
  fastify.delete('/:id', {
    schema: {
      tags: ['Merchant Reviews'],
      summary: 'Delete review',
      description: 'Delete a review from the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await reviewService.delete(id, request.storeId);
    reply.status(204).send();
  });
}