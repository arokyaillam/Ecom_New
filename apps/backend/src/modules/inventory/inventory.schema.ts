// Inventory Zod schemas
import { z } from 'zod';
import { idParamSchema } from '../_shared/schema.js';

export { idParamSchema };

export const inventoryListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  filter: z.enum(['all', 'lowStock', 'outOfStock']).default('all'),
  search: z.string().optional(),
});

export const updateInventorySchema = z.strictObject({
  currentQuantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).optional(),
  reason: z.string().optional(),
});

export const historyQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
