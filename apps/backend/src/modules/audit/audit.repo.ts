// Audit log repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { auditLogs } from '../../db/schema.js';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';

export type AuditLogSelect = typeof auditLogs.$inferSelect;
export type AuditLogInsert = typeof auditLogs.$inferInsert;

export const auditRepo = {
  insert(data: AuditLogInsert) {
    return db.insert(auditLogs).values(data).returning();
  },

  findByStoreId(
    storeId: string,
    opts: {
      page: number;
      limit: number;
      action?: string;
      entityType?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const conditions = [eq(auditLogs.storeId, storeId)];

    if (opts.action) {
      conditions.push(eq(auditLogs.action, opts.action));
    }
    if (opts.entityType) {
      conditions.push(eq(auditLogs.entityType, opts.entityType));
    }
    if (opts.userId) {
      conditions.push(eq(auditLogs.userId, opts.userId));
    }
    if (opts.startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(opts.startDate)));
    }
    if (opts.endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(opts.endDate)));
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    return db
      .select({
        id: auditLogs.id,
        storeId: auditLogs.storeId,
        userId: auditLogs.userId,
        userEmail: auditLogs.userEmail,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        description: auditLogs.description,
        previousValues: auditLogs.previousValues,
        newValues: auditLogs.newValues,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(opts.limit)
      .offset((opts.page - 1) * opts.limit);
  },

  countByStoreId(
    storeId: string,
    opts: {
      action?: string;
      entityType?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const conditions = [eq(auditLogs.storeId, storeId)];

    if (opts.action) {
      conditions.push(eq(auditLogs.action, opts.action));
    }
    if (opts.entityType) {
      conditions.push(eq(auditLogs.entityType, opts.entityType));
    }
    if (opts.userId) {
      conditions.push(eq(auditLogs.userId, opts.userId));
    }
    if (opts.startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(opts.startDate)));
    }
    if (opts.endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(opts.endDate)));
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    return db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(where);
  },
};
