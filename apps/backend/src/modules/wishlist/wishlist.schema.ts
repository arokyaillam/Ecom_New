// Wishlist Zod schemas — Phase 1
import { z } from 'zod';

export const addWishlistSchema = z.strictObject({
  productId: z.string().uuid(),
});

export const productIdParamSchema = z.strictObject({
  productId: z.string().uuid(),
});