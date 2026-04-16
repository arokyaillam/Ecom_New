// Public Shipping Routes - Calculate shipping options
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { shippingService } from '../../services/shipping.service.js';
import { ErrorCodes } from '../../errors/codes.js';

const calculateSchema = z.strictObject({
  country: z.string().min(1).max(2),
  state: z.string().max(10).optional(),
  postalCode: z.string().max(20).optional(),
  subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/),
  weightKg: z.number().min(0).optional(),
});

export default async function publicShippingRoutes(fastify: FastifyInstance) {
  // POST /api/v1/public/shipping/calculate
  fastify.post('/calculate', {
    schema: { tags: ['Public Shipping'], summary: 'Calculate shipping options' },
  }, async (request, reply) => {
    if (!request.storeId) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found' });
      return;
    }

    const parsed = calculateSchema.parse(request.body);
    const result = await shippingService.calculateShipping(
      request.storeId,
      { country: parsed.country, state: parsed.state, postalCode: parsed.postalCode },
      parsed.subtotal,
      parsed.weightKg,
    );
    return result;
  });
}