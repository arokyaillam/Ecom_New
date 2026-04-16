// Customer Orders Routes - View orders, track status
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { orderService } from '../../services/order.service.js';
import { ErrorCodes } from '../../errors/codes.js';

const listQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});

export default async function customerOrdersRoutes(fastify: FastifyInstance) {
  // GET /api/v1/customer/orders - List customer's orders
  fastify.get('/', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await orderService.findByStoreId(request.storeId, query);
    // Filter to only show this customer's orders
    const customerOrders = result.data.filter((order: { customerId: string | null }) =>
      order.customerId === request.customerId,
    );
    return {
      data: customerOrders,
      pagination: result.pagination,
    };
  });

  // GET /api/v1/customer/orders/:id - Get order detail
  fastify.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const order = await orderService.findById(id, request.storeId);

    // Ensure the order belongs to this customer
    if (order.customerId !== request.customerId) {
      reply.status(403).send({ error: 'Forbidden', code: ErrorCodes.INSUFFICIENT_PERMISSIONS, message: 'Not your order' });
      return;
    }

    return { order };
  });
}