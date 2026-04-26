// Merchant Bundle Routes - CRUD for product bundles
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { bundleService } from './bundle.service.js';
import { idParamSchema } from '../_shared/schema.js';
import { listBundlesQuerySchema, createBundleSchema, updateBundleSchema } from './bundle.schema.js';

export default async function merchantBundleRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/bundles
  fastify.get('/', {
    schema: {
      tags: ['Merchant Bundles'],
      summary: 'List bundles',
      description: 'List all product bundles for the authenticated merchant store with pagination',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listBundlesQuerySchema.parse(request.query);
    const result = await bundleService.findByStoreId(request.storeId, query);
    return result;
  });

  // POST /api/v1/merchant/bundles
  fastify.post('/', {
    preHandler: requirePermission('products:write'),
    schema: {
      tags: ['Merchant Bundles'],
      summary: 'Create bundle',
      description: 'Create a new product bundle in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = createBundleSchema.parse(request.body);
    const bundle = await bundleService.create({
      ...parsed,
      storeId: request.storeId,
    });
    reply.status(201).send({ bundle });
  });

  // GET /api/v1/merchant/bundles/:id
  fastify.get('/:id', {
    schema: {
      tags: ['Merchant Bundles'],
      summary: 'Get bundle detail',
      description: 'Retrieve a single product bundle by ID for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const bundle = await bundleService.findById(id, request.storeId);
    return { bundle };
  });

  // PATCH /api/v1/merchant/bundles/:id
  fastify.patch('/:id', {
    preHandler: requirePermission('products:write'),
    schema: {
      tags: ['Merchant Bundles'],
      summary: 'Update bundle',
      description: 'Partial update of a product bundle in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateBundleSchema.parse(request.body);
    const bundle = await bundleService.update(id, request.storeId, parsed);
    return { bundle };
  });

  // DELETE /api/v1/merchant/bundles/:id
  fastify.delete('/:id', {
    preHandler: requirePermission('products:write'),
    schema: {
      tags: ['Merchant Bundles'],
      summary: 'Delete bundle',
      description: 'Delete a product bundle from the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await bundleService.delete(id, request.storeId);
    reply.status(204).send();
  });
}
