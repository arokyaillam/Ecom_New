// Report Zod schemas
import { z } from 'zod';

export const reportDateRangeSchema = z.strictObject({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
