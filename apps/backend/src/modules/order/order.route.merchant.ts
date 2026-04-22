// Merchant Orders Routes - Order listing, detail, status updates
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { orderService } from './order.service.js';
import { merchantListQuerySchema as listQuerySchema, idParamSchema, updateStatusSchema } from './order.schema.js';

export default async function merchantOrdersRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/orders
  fastify.get('/', {
    schema: {
      tags: ['Merchant Orders'],
      summary: 'List orders',
      description: 'List all orders for the authenticated merchant store with optional status filter and pagination',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await orderService.findByStoreId(request.storeId, query);
    return result;
  });

  // GET /api/v1/merchant/orders/:id
  fastify.get('/:id', {
    schema: {
      tags: ['Merchant Orders'],
      summary: 'Get order detail',
      description: 'Retrieve a single order by ID for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const order = await orderService.findById(id, request.storeId);
    return { order };
  });

  // PATCH /api/v1/merchant/orders/:id/status
  fastify.patch('/:id/status', {
    preHandler: requirePermission('orders:write'),
    schema: {
      tags: ['Merchant Orders'],
      summary: 'Update order status',
      description: 'Update the status of an order (pending, processing, shipped, delivered, cancelled)',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateStatusSchema.parse(request.body);
    const order = await orderService.updateStatus(id, request.storeId, parsed.status);
    return { order };
  });
}