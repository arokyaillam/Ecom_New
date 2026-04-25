// Payment Zod schemas — provider config, payment intent, idempotency, refunds, disputes
import { z } from 'zod';

export const providerEnum = z.enum(['razorpay', 'stripe', 'cod']);

export const configureProviderSchema = z.strictObject({
  provider: providerEnum,
  isEnabled: z.boolean(),
  config: z.record(z.string(), z.string()).optional(),
});

export const createPaymentIntentSchema = z.strictObject({
  orderId: z.string().uuid(),
  provider: providerEnum,
});

export const idempotencyKeySchema = z.strictObject({
  idempotencyKey: z.string().min(1).optional(),
});

export const orderIdParamSchema = z.strictObject({
  orderId: z.string().uuid(),
});

export const refundSchema = z.strictObject({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  reason: z.string().min(1).max(500),
});

export const paymentListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']).optional(),
  orderId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const disputeSchema = z.strictObject({
  paymentId: z.string().uuid(),
  reason: z.string().min(1).max(1000),
  status: z.enum(['open', 'resolved', 'rejected']).default('open'),
});