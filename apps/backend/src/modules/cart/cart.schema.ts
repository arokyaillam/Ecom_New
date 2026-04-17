// Cart Zod schemas — Phase 1
import { z } from 'zod';

export const addItemSchema = z.strictObject({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  variantOptionIds: z.array(z.string().uuid()).optional(),
  combinationKey: z.string().optional(),
  modifierOptionIds: z.array(z.string().uuid()).optional(),
});

export const updateItemSchema = z.strictObject({
  quantity: z.number().int().min(1),
});

export const itemIdParamSchema = z.strictObject({
  itemId: z.string().uuid(),
});