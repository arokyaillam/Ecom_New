// Merchant Orders Routes - Order listing, detail, status updates
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { orderService } from '../../services/order.service.js';

const listQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
});

const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});

const updateStatusSchema = z.strictObject({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
});

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