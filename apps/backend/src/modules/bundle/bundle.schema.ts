// Bundle Zod schemas
import { z } from 'zod';
import { idParamSchema, paginationQuerySchema } from '../_shared/schema.js';

export { idParamSchema };

export const createBundleSchema = z.strictObject({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  isActive: z.boolean().default(true),
  items: z.array(z.strictObject({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).default(1),
    sortOrder: z.number().int().default(0),
  })).min(2),
});

export const updateBundleSchema = z.strictObject({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  isActive: z.boolean().optional(),
  items: z.array(z.strictObject({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).default(1),
    sortOrder: z.number().int().default(0),
  })).min(2).optional(),
});

export const listBundlesQuerySchema = paginationQuerySchema.extend({
  isActive: z.coerce.boolean().optional(),
});
