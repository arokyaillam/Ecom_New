// Merchant Tax Routes - Tax rate CRUD
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { taxService } from '../../services/tax.service.js';

const idParamSchema = z.strictObject({ id: z.string().uuid() });

const createTaxRateSchema = z.strictObject({
  name: z.string().min(1).max(255),
  rate: z.string().regex(/^0?\.\d{1,6}$|^1(\.0{1,6})?$/, 'Rate must be decimal between 0 and 1 (e.g. 0.0825 for 8.25%)'),
  country: z.string().max(2).optional(), // ISO 3166-1 alpha-2
  state: z.string().max(10).optional(),
  postalCode: z.string().max(20).optional(),
  isCompound: z.boolean().optional(),
  priority: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

const updateTaxRateSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  rate: z.string().regex(/^0?\.\d{1,6}$|^1(\.0{1,6})?$/).optional(),
  country: z.string().max(2).optional(),
  state: z.string().max(10).optional(),
  postalCode: z.string().max(20).optional(),
  isCompound: z.boolean().optional(),
  priority: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export default async function merchantTaxRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/tax
  fastify.get('/', {
    schema: { tags: ['Merchant Tax'], summary: 'List tax rates', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const rates = await taxService.listRates(request.storeId);
    return { rates };
  });

  // POST /api/v1/merchant/tax
  fastify.post('/', {
    schema: { tags: ['Merchant Tax'], summary: 'Create tax rate', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const parsed = createTaxRateSchema.parse(request.body);
    const rate = await taxService.createRate(request.storeId, parsed);
    reply.status(201).send({ rate });
  });

  // GET /api/v1/merchant/tax/:id
  fastify.get('/:id', {
    schema: { tags: ['Merchant Tax'], summary: 'Get tax rate', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const rate = await taxService.getRate(id, request.storeId);
    if (!rate) return { rate: null };
    return { rate };
  });

  // PATCH /api/v1/merchant/tax/:id
  fastify.patch('/:id', {
    schema: { tags: ['Merchant Tax'], summary: 'Update tax rate', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateTaxRateSchema.parse(request.body);
    const rate = await taxService.updateRate(id, request.storeId, parsed);
    return { rate };
  });

  // DELETE /api/v1/merchant/tax/:id
  fastify.delete('/:id', {
    schema: { tags: ['Merchant Tax'], summary: 'Delete tax rate', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await taxService.deleteRate(id, request.storeId);
    reply.status(204).send();
  });
}