// Upload Zod schemas
import { z } from 'zod';

export const deleteSchema = z.strictObject({
  url: z.string().min(1),
});