// SuperAdmin Zod schemas — Phase 1
import { z } from 'zod';
import { idParamSchema } from '../_shared/schema.js';

export { idParamSchema };

export const merchantListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'active', 'suspended']).optional(),
});

export const createPlanSchema = z.strictObject({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  currency: z.string().max(3).default('USD'),
  interval: z.enum(['month', 'year']).default('month'),
  features: z.array(z.string()).optional(),
  maxProducts: z.number().int().min(1).default(100),
  maxStorage: z.number().int().min(1).default(1024),
  isActive: z.boolean().default(true),
});

export const updatePlanSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency: z.string().max(3).optional(),
  interval: z.enum(['month', 'year']).optional(),
  features: z.array(z.string()).nullable().optional(),
  maxProducts: z.number().int().min(1).optional(),
  maxStorage: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});