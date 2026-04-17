// Shipping Zod schemas
import { z } from 'zod';
import { idParamSchema } from '../_shared/schema.js';

export { idParamSchema };

// --- Public route schemas ---

export const shippingCalculateSchema = z.strictObject({
  country: z.string().min(1).max(2),
  state: z.string().max(10).optional(),
  postalCode: z.string().max(20).optional(),
  subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/),
  weightKg: z.number().min(0).optional(),
});

// --- Merchant route schemas ---

export const zoneIdParamSchema = z.strictObject({
  zoneId: z.string().uuid(),
});

export const createZoneSchema = z.strictObject({
  name: z.string().min(1).max(255),
  countries: z.array(z.string()).optional(),
  states: z.array(z.string()).optional(),
  postalCodePatterns: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const updateZoneSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  countries: z.array(z.string()).optional(),
  states: z.array(z.string()).optional(),
  postalCodePatterns: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const createRateSchema = z.strictObject({
  name: z.string().min(1).max(255),
  method: z.enum(['standard', 'express', 'overnight', 'pickup']),
  carrier: z.string().max(100).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  freeAbove: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  weightBased: z.boolean().optional(),
  pricePerKg: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  estimatedDays: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateRateSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  method: z.enum(['standard', 'express', 'overnight', 'pickup']).optional(),
  carrier: z.string().max(100).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  freeAbove: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  weightBased: z.boolean().optional(),
  pricePerKg: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  estimatedDays: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});