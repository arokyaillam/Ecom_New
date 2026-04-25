// Support ticket Zod schemas
import { z } from 'zod';

export const createTicketSchema = z.strictObject({
  subject: z.string().min(1).max(255),
  description: z.string().min(1),
  category: z.enum(['billing', 'technical', 'general', 'feature_request']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export const listTicketsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
});

export const updateTicketStatusSchema = z.strictObject({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  resolution: z.string().optional(),
});
