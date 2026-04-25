// Merchant Payment Routes — provider configuration, payment status, refunds, disputes
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { paymentService } from './payment.service.js';
import {
  configureProviderSchema,
  orderIdParamSchema,
  paymentListQuerySchema,
  refundSchema,
  disputeSchema,
} from './payment.schema.js';
import { idParamSchema } from '../_shared/schema.js';

export default async function merchantPaymentRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/payments
  fastify.get('/', {
    schema: {
      tags: ['Merchant Payments'],
      summary: 'List payments',
      description: 'List all payments for the authenticated merchant store with optional filters and pagination',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = paymentListQuerySchema.parse(request.query);
    const result = await paymentService.listPayments(request.storeId, query);
    return result;
  });

  // GET /api/v1/merchant/payments/:id
  fastify.get('/:id', {
    schema: {
      tags: ['Merchant Payments'],
      summary: 'Get payment detail',
      description: 'Retrieve a single payment by ID including refund history',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const result = await paymentService.getPaymentDetail(id, request.storeId);
    return result;
  });

  // POST /api/v1/merchant/payments/:id/refund
  fastify.post('/:id/refund', {
    preHandler: requirePermission('payments:refund'),
    schema: {
      tags: ['Merchant Payments'],
      summary: 'Refund a payment',
      description: 'Issue a refund for a completed payment',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = refundSchema.parse(request.body);
    const refund = await paymentService.refundPayment(
      id,
      request.storeId,
      request.userId,
      parsed,
    );
    reply.status(201).send({ refund });
  });

  // GET /api/v1/merchant/payments/:id/refunds
  fastify.get('/:id/refunds', {
    schema: {
      tags: ['Merchant Payments'],
      summary: 'List refunds for a payment',
      description: 'Retrieve all refunds associated with a payment',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const refunds = await paymentService.getPaymentDetail(id, request.storeId);
    return { refunds: refunds.refunds };
  });

  // GET /api/v1/merchant/payments/disputes
  fastify.get('/disputes', {
    schema: {
      tags: ['Merchant Payments'],
      summary: 'List disputes',
      description: 'List all payment disputes for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = paymentListQuerySchema.parse(request.query);
    const result = await paymentService.listDisputes(request.storeId, {
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
    return result;
  });

  // POST /api/v1/merchant/payments/disputes
  fastify.post('/disputes', {
    preHandler: requirePermission('payments:manage'),
    schema: {
      tags: ['Merchant Payments'],
      summary: 'Create a dispute',
      description: 'Open a payment dispute',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = disputeSchema.parse(request.body);
    const dispute = await paymentService.createDispute(
      parsed.paymentId,
      request.storeId,
      { reason: parsed.reason, status: parsed.status },
    );
    reply.status(201).send({ dispute });
  });

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
