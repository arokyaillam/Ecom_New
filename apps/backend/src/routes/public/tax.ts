// Public Tax Routes - Calculate tax
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { taxService } from '../../services/tax.service.js';
import { ErrorCodes } from '../../errors/codes.js';

const calculateSchema = z.strictObject({
  country: z.string().min(1).max(2),
  state: z.string().max(10).optional(),
  postalCode: z.string().max(20).optional(),
  subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/),
  shipping: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
});

export default async function publicTaxRoutes(fastify: FastifyInstance) {
  // POST /api/v1/public/tax/calculate
  fastify.post('/calculate', {
    schema: { tags: ['Public Tax'], summary: 'Calculate tax' },
  }, async (request, reply) => {
    if (!request.storeId) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found' });
      return;
    }

    const parsed = calculateSchema.parse(request.body);
    const result = await taxService.calculateTax(
      request.storeId,
      { country: parsed.country, state: parsed.state, postalCode: parsed.postalCode },
      parsed.subtotal,
      parsed.shipping,
    );
    return result;
  });
}