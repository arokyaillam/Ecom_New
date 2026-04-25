// Merchant Orders Routes - Order listing, detail, status updates
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { orderService } from './order.service.js';
import { merchantListQuerySchema as listQuerySchema, idParamSchema, updateStatusSchema, refundOrderSchema } from './order.schema.js';

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
      description: 'Update the status of an order (pending, processing, shipped, delivered, cancelled, refunded)',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateStatusSchema.parse(request.body);
    const order = await orderService.updateStatus(id, request.storeId, parsed.status, request.userId);
    return { order };
  });

  // POST /api/v1/merchant/orders/:id/refund
  fastify.post('/:id/refund', {
    preHandler: requirePermission('orders:refund'),
    schema: {
      tags: ['Merchant Orders'],
      summary: 'Refund an order',
      description: 'Issue a full refund for a delivered order and mark it as refunded',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = refundOrderSchema.parse(request.body);
    const result = await orderService.refundOrder(id, request.storeId, request.userId, parsed.reason);
    reply.status(201).send(result);
  });
}