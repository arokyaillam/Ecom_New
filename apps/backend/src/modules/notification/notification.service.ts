// Notification service — business logic, calls repo, throws domain errors
import { notificationRepo } from './notification.repo.js';
import { ErrorCodes } from '../../errors/codes.js';

export const notificationService = {
  async createNotification(
    storeId: string,
    data: {
      type: 'order' | 'inventory' | 'payment' | 'system';
      title: string;
      message: string;
      linkUrl?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const [notification] = await notificationRepo.insert({
      storeId,
      type: data.type,
      title: data.title,
      message: data.message,
      linkUrl: data.linkUrl,
      metadata: data.metadata,
    });

    if (!notification) {
      throw Object.assign(new Error('Failed to create notification'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return notification;
  },

  async findByStoreId(
    storeId: string,
    opts: { page: number; limit: number; isRead?: boolean },
  ) {
    const [items, countResult] = await Promise.all([
      notificationRepo.findByStoreId(storeId, opts),
      notificationRepo.countByStoreId(storeId, opts.isRead),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      items,
      total,
      page: opts.page,
      limit: opts.limit,
      totalPages: Math.ceil(total / opts.limit),
    };
  },

  async markAsRead(id: string, storeId: string) {
    const [notification] = await notificationRepo.markAsRead(id, storeId);

    if (!notification) {
      throw Object.assign(new Error('Notification not found'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return notification;
  },

  async markAllAsRead(storeId: string) {
    const result = await notificationRepo.markAllAsRead(storeId);
    return { updated: result.length };
  },

  async getUnreadCount(storeId: string) {
    const [result] = await notificationRepo.countUnread(storeId);
    return { count: result?.count ?? 0 };
  },
};
