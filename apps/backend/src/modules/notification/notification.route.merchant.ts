// Merchant Notifications Routes
import { FastifyInstance } from 'fastify';
import { notificationService } from './notification.service.js';
import { listNotificationsQuerySchema, notificationIdParamSchema } from './notification.schema.js';

export default async function merchantNotificationRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/notifications
  fastify.get('/', {
    schema: {
      tags: ['Merchant Notifications'],
      summary: 'List notifications',
      description: 'List notifications for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listNotificationsQuerySchema.parse(request.query);
    return notificationService.findByStoreId(request.storeId, query);
  });

  // GET /api/v1/merchant/notifications/unread-count
  fastify.get('/unread-count', {
    schema: {
      tags: ['Merchant Notifications'],
      summary: 'Unread count',
      description: 'Get the number of unread notifications',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    return notificationService.getUnreadCount(request.storeId);
  });

  // PATCH /api/v1/merchant/notifications/:id/read
  fastify.patch('/:id/read', {
    schema: {
      tags: ['Merchant Notifications'],
      summary: 'Mark as read',
      description: 'Mark a single notification as read',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = notificationIdParamSchema.parse(request.params);
    const notification = await notificationService.markAsRead(id, request.storeId);
    return { notification };
  });

  // POST /api/v1/merchant/notifications/read-all
  fastify.post('/read-all', {
    schema: {
      tags: ['Merchant Notifications'],
      summary: 'Mark all as read',
      description: 'Mark all notifications as read for the store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    return notificationService.markAllAsRead(request.storeId);
  });
}
