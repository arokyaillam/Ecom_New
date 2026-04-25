// Marketing Zod schemas
import { z } from 'zod';

export const listQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createBannerSchema = z.strictObject({
  title: z.string().min(1).max(255),
  subtitle: z.string().max(500).optional(),
  imageUrl: z.string().url().max(1000).optional(),
  linkUrl: z.string().url().max(1000).optional(),
  position: z.enum(['homepage_hero', 'homepage_featured', 'homepage_promo', 'product_page', 'cart_page']).default('homepage_hero'),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const updateBannerSchema = z.strictObject({
  title: z.string().min(1).max(255).optional(),
  subtitle: z.string().max(500).nullable().optional(),
  imageUrl: z.string().url().max(1000).nullable().optional(),
  linkUrl: z.string().url().max(1000).nullable().optional(),
  position: z.enum(['homepage_hero', 'homepage_featured', 'homepage_promo', 'product_page', 'cart_page']).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

export const reorderSchema = z.strictObject({
  ids: z.array(z.string().uuid()).min(1),
});
