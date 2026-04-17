// Public Tax Routes - Calculate tax
import { FastifyInstance } from 'fastify';
import { taxCalculateSchema } from './tax.schema.js';
import { taxService } from './tax.service.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function publicTaxRoutes(fastify: FastifyInstance) {
  // POST /api/v1/public/tax/calculate
  fastify.post('/calculate', {
    schema: { tags: ['Public Tax'], summary: 'Calculate tax' },
  }, async (request, reply) => {
    if (!request.storeId) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found' });
      return;
    }

    const parsed = taxCalculateSchema.parse(request.body);
    const result = await taxService.calculateTax(
      request.storeId,
      { country: parsed.country, state: parsed.state, postalCode: parsed.postalCode },
      parsed.subtotal,
      parsed.shipping,
    );
    return result;
  });
}