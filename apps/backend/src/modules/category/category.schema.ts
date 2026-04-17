// Category Zod schemas
import { z } from 'zod';

export const createCategorySchema = z.strictObject({
  nameEn: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
});

export const updateCategorySchema = z.strictObject({
  nameEn: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).nullable().optional(),
});

export const listQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createSubcategorySchema = z.strictObject({
  nameEn: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
});

export const updateSubcategorySchema = z.strictObject({
  nameEn: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).nullable().optional(),
});

export const categoryIdParamSchema = z.strictObject({
  categoryId: z.string().uuid(),
});

export const categorySubcategoryIdParamSchema = z.strictObject({
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid(),
});