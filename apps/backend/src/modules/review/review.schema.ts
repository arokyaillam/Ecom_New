// Review Zod schemas
import { z } from 'zod';
import { idParamSchema, paginationQuerySchema } from '../_shared/schema.js';

export { idParamSchema, paginationQuerySchema as listQuerySchema };

// --- Public/Customer route schemas ---

export const createReviewSchema = z.strictObject({
  productId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  content: z.string().min(1).max(2000),
  images: z.array(z.string().url()).optional(),
});

export const updateReviewSchema = z.strictObject({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(255).optional(),
  content: z.string().min(1).max(2000).optional(),
  images: z.array(z.string().url()).optional(),
});

// --- Merchant route schemas ---

export const respondSchema = z.strictObject({
  response: z.string().min(1).max(2000),
});

export const approveSchema = z.strictObject({
  isApproved: z.boolean(),
});