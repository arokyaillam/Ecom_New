// Checkout Zod schemas — Phase 1
import { z } from 'zod';

export const checkoutItemSchema = z.strictObject({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  variantOptionIds: z.array(z.string().uuid()).optional(),
  combinationKey: z.string().optional(),
  modifierOptionIds: z.array(z.string().uuid()).optional(),
});

export const checkoutSchema = z.strictObject({
  email: z.email(),
  phone: z.string().max(50).optional(),
  currency: z.string().max(3).default('USD'),
  items: z.array(checkoutItemSchema).min(1),
  cartId: z.string().uuid().optional(),
  billingName: z.string().max(255).optional(),
  billingFirstName: z.string().max(255).optional(),
  billingLastName: z.string().max(255).optional(),
  billingAddressLine1: z.string().max(500).optional(),
  billingAddressLine2: z.string().max(500).optional(),
  billingCity: z.string().max(255).optional(),
  billingState: z.string().max(255).optional(),
  billingCountry: z.string().max(255).optional(),
  billingPostalCode: z.string().max(20).optional(),
  shippingName: z.string().max(255).optional(),
  shippingFirstName: z.string().max(255).optional(),
  shippingLastName: z.string().max(255).optional(),
  shippingAddressLine1: z.string().max(500).optional(),
  shippingAddressLine2: z.string().max(500).optional(),
  shippingCity: z.string().max(255).optional(),
  shippingState: z.string().max(255).optional(),
  shippingCountry: z.string().max(255).optional(),
  shippingPostalCode: z.string().max(20).optional(),
  paymentMethod: z.enum(['razorpay', 'stripe', 'cod']).optional(),
  couponCode: z.string().max(50).optional(),
  shippingRateId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});