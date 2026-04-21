// Public Payment Routes — provider listing, webhook handlers (no auth, signature verified)
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { payments } from '../../db/schema.js';
import { paymentService, verifyRazorpaySignature, verifyStripeSignature } from './payment.service.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function publicPaymentRoutes(fastify: FastifyInstance) {
  // GET /api/v1/public/payments/providers
  // Returns only enabled providers (no config/keys) for storefront display
  fastify.get('/providers', {
    schema: { tags: ['Public Payments'], summary: 'List enabled payment providers for storefront' },
  }, async (request, reply) => {
    if (!request.storeId) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found' });
      return;
    }
    const providers = await paymentService.getProviders(request.storeId);
    // Only return enabled providers with minimal info (no config/keys)
    const enabled = providers
      .filter((p) => p.isEnabled)
      .map((p) => ({ provider: p.provider, isEnabled: p.isEnabled }));
    return { providers: enabled };
  });

  // POST /api/v1/public/payments/webhook/razorpay
  fastify.post('/webhook/razorpay', {
    config: {
      rawBody: true,
    },
    schema: { tags: ['Public Payments'], summary: 'Razorpay webhook handler' },
  }, async (request, reply) => {
    const signature = request.headers['x-razorpay-signature'] as string;
    if (!signature) {
      reply.status(400).send({ error: 'Bad Request', message: 'Missing webhook signature' });
      return;
    }

    try {
      const rawBody = (request as any).rawBody ?? JSON.stringify(request.body);
      const payload = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

      // Find the payment record by Razorpay order_id from the webhook payload
      const payloadData = payload.payload as Record<string, unknown> | undefined;
      const paymentNested = payloadData?.payment as Record<string, unknown> | undefined;
      const paymentEntity = paymentNested?.entity as Record<string, unknown> | undefined;
      const orderNested = payloadData?.order as Record<string, unknown> | undefined;
      const orderEntity = orderNested?.entity as Record<string, unknown> | undefined;
      const razorpayOrderId: string | undefined =
        (paymentEntity?.order_id as string | undefined) ?? (orderEntity?.id as string | undefined);

      if (!razorpayOrderId) {
        reply.status(200).send({ received: true });
        return;
      }

      // Look up the payment to find storeId and verify signature
      const payment = await db.query.payments.findFirst({
        where: eq(payments.providerPaymentId, razorpayOrderId),
      });

      if (!payment) {
        reply.status(200).send({ received: true });
        return;
      }

      // Get provider config to verify signature
      const providerConfig = await paymentService.findProviderByStoreId(payment.storeId, 'razorpay');
      if (!providerConfig?.config) {
        reply.status(200).send({ received: true });
        return;
      }

      const config = providerConfig.config as Record<string, string>;
      const isValid = verifyRazorpaySignature(rawBody, signature, config.webhook_secret);
      if (!isValid) {
        reply.status(400).send({ error: 'Bad Request', message: 'Invalid webhook signature' });
        return;
      }

      const result = await paymentService.handleWebhook('razorpay', payload, signature, rawBody, payment.storeId);
      return result;
    } catch (err) {
      fastify.log.error(err, 'Razorpay webhook error');
      reply.status(200).send({ received: true });
    }
  });

  // POST /api/v1/public/payments/webhook/stripe
  fastify.post('/webhook/stripe', {
    config: {
      rawBody: true,
    },
    schema: { tags: ['Public Payments'], summary: 'Stripe webhook handler' },
  }, async (request, reply) => {
    const signature = request.headers['stripe-signature'] as string;
    if (!signature) {
      reply.status(400).send({ error: 'Bad Request', message: 'Missing webhook signature' });
      return;
    }

    try {
      const rawBody = (request as any).rawBody ?? JSON.stringify(request.body);
      const payload = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

      // Find the payment by Stripe PaymentIntent ID
      const dataObject = (payload.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined;
      const stripePaymentIntentId = dataObject?.id as string | undefined;

      if (!stripePaymentIntentId) {
        reply.status(200).send({ received: true });
        return;
      }

      // Look up the payment to find storeId and verify signature
      const payment = await db.query.payments.findFirst({
        where: eq(payments.providerPaymentId, stripePaymentIntentId),
      });

      if (!payment) {
        reply.status(200).send({ received: true });
        return;
      }

      // Get provider config to verify signature
      const providerConfig = await paymentService.findProviderByStoreId(payment.storeId, 'stripe');
      if (!providerConfig?.config) {
        reply.status(200).send({ received: true });
        return;
      }

      const config = providerConfig.config as Record<string, string>;
      const isValid = verifyStripeSignature(rawBody, signature, config.webhook_secret);
      if (!isValid) {
        reply.status(400).send({ error: 'Bad Request', message: 'Invalid webhook signature' });
        return;
      }

      const result = await paymentService.handleWebhook('stripe', payload, signature, rawBody, payment.storeId);
      return result;
    } catch (err) {
      fastify.log.error(err, 'Stripe webhook error');
      reply.status(200).send({ received: true });
    }
  });
}