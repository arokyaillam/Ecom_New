// Merchant Marketing Routes - CRUD for banners
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { marketingService } from './marketing.service.js';
import { idParamSchema } from '../_shared/schema.js';
import { listQuerySchema, createBannerSchema, updateBannerSchema, reorderSchema } from './marketing.schema.js';

export default async function merchantMarketingRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/marketing/banners
  fastify.get('/banners', {
    schema: {
      tags: ['Merchant Marketing'],
      summary: 'List banners',
      description: 'List all banners for the authenticated merchant store with pagination',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await marketingService.findByStoreId(request.storeId, query);
    return result;
  });

  // POST /api/v1/merchant/marketing/banners
  fastify.post('/banners', {
    preHandler: requirePermission('store:write'),
    schema: {
      tags: ['Merchant Marketing'],
      summary: 'Create banner',
      description: 'Create a new banner in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = createBannerSchema.parse(request.body);
    const banner = await marketingService.create({
      ...parsed,
      storeId: request.storeId,
      startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
      endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
    });
    reply.status(201).send({ banner });
  });

  // GET /api/v1/merchant/marketing/banners/:id
  fastify.get('/banners/:id', {
    schema: {
      tags: ['Merchant Marketing'],
      summary: 'Get banner detail',
      description: 'Retrieve a single banner by ID for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const banner = await marketingService.findById(id, request.storeId);
    return { banner };
  });

  // PATCH /api/v1/merchant/marketing/banners/:id
  fastify.patch('/banners/:id', {
    preHandler: requirePermission('store:write'),
    schema: {
      tags: ['Merchant Marketing'],
      summary: 'Update banner',
      description: 'Partial update of a banner in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateBannerSchema.parse(request.body);
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value === undefined) continue;
      if ((key === 'startDate' || key === 'endDate') && typeof value === 'string') {
        updateData[key] = new Date(value as string);
      } else {
        updateData[key] = value;
      }
    }
    const banner = await marketingService.update(id, request.storeId, updateData as Parameters<typeof marketingService.update>[2]);
    return { banner };
  });

  // DELETE /api/v1/merchant/marketing/banners/:id
  fastify.delete('/banners/:id', {
    preHandler: requirePermission('store:write'),
    schema: {
      tags: ['Merchant Marketing'],
      summary: 'Delete banner',
      description: 'Delete a banner from the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await marketingService.delete(id, request.storeId);
    reply.status(204).send();
  });

  // POST /api/v1/merchant/marketing/banners/reorder
  fastify.post('/banners/reorder', {
    preHandler: requirePermission('store:write'),
    schema: {
      tags: ['Merchant Marketing'],
      summary: 'Reorder banners',
      description: 'Batch reorder banners by providing ordered array of banner IDs',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const parsed = reorderSchema.parse(request.body);
    const banners = await marketingService.reorder(request.storeId, parsed.ids);
    return { banners };
  });
}
