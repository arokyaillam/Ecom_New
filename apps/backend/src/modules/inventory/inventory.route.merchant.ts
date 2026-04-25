// Merchant Inventory Routes
import { FastifyInstance } from 'fastify';
import { inventoryService } from './inventory.service.js';
import { requirePermission } from '../../scopes/merchant.js';
import { idParamSchema, inventoryListQuerySchema, updateInventorySchema, historyQuerySchema } from './inventory.schema.js';

export default async function merchantInventoryRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/inventory
  fastify.get('/', {
    schema: {
      tags: ['Merchant Inventory'],
      summary: 'List inventory',
      description: 'List all products with inventory status for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = inventoryListQuerySchema.parse(request.query);
    const result = await inventoryService.findByStoreId(request.storeId, query);
    return result;
  });

  // PATCH /api/v1/merchant/inventory/:id
  fastify.patch('/:id', {
    preHandler: requirePermission('inventory:write'),
    schema: {
      tags: ['Merchant Inventory'],
      summary: 'Update stock',
      description: 'Update stock quantity and optionally low stock threshold for a product',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateInventorySchema.parse(request.body);
    const product = await inventoryService.updateStock(
      id,
      request.storeId,
      request.userId,
      parsed,
    );
    return { product };
  });

  // GET /api/v1/merchant/inventory/:id/history
  fastify.get('/:id/history', {
    schema: {
      tags: ['Merchant Inventory'],
      summary: 'Get inventory history',
      description: 'Get inventory change history for a specific product',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const query = historyQuerySchema.parse(request.query);
    const result = await inventoryService.getHistory(id, request.storeId, query);
    return result;
  });
}
