// Notification repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { notifications } from '../../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

export type NotificationSelect = typeof notifications.$inferSelect;
export type NotificationInsert = typeof notifications.$inferInsert;

export const notificationRepo = {
  insert(data: NotificationInsert) {
    return db.insert(notifications).values(data).returning();
  },

  findByStoreId(
    storeId: string,
    opts: { page: number; limit: number; isRead?: boolean },
  ) {
    const conditions = [eq(notifications.storeId, storeId)];
    if (opts.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, opts.isRead));
    }
    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    return db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(opts.limit)
      .offset((opts.page - 1) * opts.limit);
  },

  countByStoreId(storeId: string, isRead?: boolean) {
    const conditions = [eq(notifications.storeId, storeId)];
    if (isRead !== undefined) {
      conditions.push(eq(notifications.isRead, isRead));
    }
    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    return db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(where);
  },

  findById(id: string, storeId: string) {
    return db.query.notifications.findFirst({
      where: and(eq(notifications.id, id), eq(notifications.storeId, storeId)),
    });
  },

  markAsRead(id: string, storeId: string) {
    return db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.storeId, storeId)))
      .returning();
  },

  markAllAsRead(storeId: string) {
    return db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.storeId, storeId))
      .returning();
  },

  countUnread(storeId: string) {
    return db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.storeId, storeId), eq(notifications.isRead, false)));
  },
};
