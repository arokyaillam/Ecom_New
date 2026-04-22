// Merchant Payment Routes — provider configuration and payment status
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { paymentService } from './payment.service.js';
import { configureProviderSchema, orderIdParamSchema } from './payment.schema.js';

export default async function merchantPaymentRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/payments/providers
  fastify.get('/providers', {
    schema: { tags: ['Merchant Payments'], summary: 'List configured payment providers', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const providers = await paymentService.getProviders(request.storeId);
    return { providers };
  });

  // POST /api/v1/merchant/payments/providers
  fastify.post('/providers', {
    preHandler: requirePermission('payments:config'),
    schema: { tags: ['Merchant Payments'], summary: 'Configure a payment provider', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const parsed = configureProviderSchema.parse(request.body);
    const provider = await paymentService.configureProvider(
      request.storeId,
      parsed.provider,
      parsed.isEnabled,
      parsed.config,
    );
    reply.status(201).send({ provider });
  });

  // GET /api/v1/merchant/payments/orders/:orderId
  fastify.get('/orders/:orderId', {
    schema: { tags: ['Merchant Payments'], summary: 'Get payment status for an order', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const { orderId } = orderIdParamSchema.parse(request.params);
    const status = await paymentService.getPaymentStatus(orderId, request.storeId);
    return status;
  });
}