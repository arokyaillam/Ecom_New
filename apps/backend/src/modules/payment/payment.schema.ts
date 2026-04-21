// Payment Zod schemas — provider config, payment intent, idempotency
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