// Analytics Zod schemas
import { z } from 'zod';

// --- Merchant route schemas ---

export const revenueQuerySchema = z.strictObject({
  period: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});