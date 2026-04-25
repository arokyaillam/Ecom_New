// Notification Zod schemas
import { z } from 'zod';

export const createNotificationSchema = z.strictObject({
  storeId: z.string().uuid(),
  type: z.enum(['order', 'inventory', 'payment', 'system']),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  linkUrl: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const listNotificationsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isRead: z.coerce.boolean().optional(),
});

export const notificationIdParamSchema = z.strictObject({
  id: z.string().uuid(),
});
