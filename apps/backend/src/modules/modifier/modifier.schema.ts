// Modifier Zod schemas
import { z } from 'zod';

export const listQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createModifierGroupSchema = z.strictObject({
  productId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  applyTo: z.enum(['product', 'category']).default('product'),
  name: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
  isRequired: z.boolean().default(false),
  minSelections: z.number().int().min(0).default(1),
  maxSelections: z.number().int().min(1).default(1),
  sortOrder: z.number().int().default(0),
});

export const updateModifierGroupSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).nullable().optional(),
  isRequired: z.boolean().optional(),
  minSelections: z.number().int().min(0).optional(),
  maxSelections: z.number().int().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

export const createModifierOptionSchema = z.strictObject({
  nameEn: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
  priceAdjustment: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  imageUrl: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isAvailable: z.boolean().default(true),
});

export const updateModifierOptionSchema = z.strictObject({
  nameEn: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).nullable().optional(),
  priceAdjustment: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  imageUrl: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isAvailable: z.boolean().optional(),
});

export const productIdQuerySchema = z.strictObject({
  productId: z.string().uuid(),
});

export const groupIdParamSchema = z.strictObject({
  groupId: z.string().uuid(),
});

export const optionIdParamSchema = z.strictObject({
  optionId: z.string().uuid(),
});