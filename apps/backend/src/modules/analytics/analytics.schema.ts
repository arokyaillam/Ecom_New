// Analytics Zod schemas
import { z } from 'zod';

// --- Merchant route schemas ---

export const revenueQuerySchema = z.strictObject({
  period: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const bestSellersQuerySchema = z.strictObject({
  limit: z.coerce.number().min(1).max(100).default(10),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const retentionQuerySchema = z.strictObject({
  period: z.enum(['daily', 'weekly', 'monthly']).default('monthly'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const funnelQuerySchema = z.strictObject({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const orderTrendsQuerySchema = z.strictObject({
  period: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
