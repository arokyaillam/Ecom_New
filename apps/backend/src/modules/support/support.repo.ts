// Support ticket repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { supportTickets } from '../../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

export type SupportTicketSelect = typeof supportTickets.$inferSelect;
export type SupportTicketInsert = typeof supportTickets.$inferInsert;

export const supportRepo = {
  insert(data: SupportTicketInsert) {
    return db.insert(supportTickets).values(data).returning();
  },

  findByStoreId(
    storeId: string,
    opts: {
      page: number;
      limit: number;
      status?: string;
    },
  ) {
    const conditions = [eq(supportTickets.storeId, storeId)];

    if (opts.status) {
      conditions.push(eq(supportTickets.status, opts.status));
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    return db
      .select()
      .from(supportTickets)
      .where(where)
      .orderBy(desc(supportTickets.createdAt))
      .limit(opts.limit)
      .offset((opts.page - 1) * opts.limit);
  },

  countByStoreId(
    storeId: string,
    opts: {
      status?: string;
    },
  ) {
    const conditions = [eq(supportTickets.storeId, storeId)];

    if (opts.status) {
      conditions.push(eq(supportTickets.status, opts.status));
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    return db
      .select({ count: sql<number>`count(*)::int` })
      .from(supportTickets)
      .where(where);
  },

  findById(ticketId: string, storeId: string) {
    return db
      .select()
      .from(supportTickets)
      .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.storeId, storeId)))
      .limit(1);
  },

  updateStatus(
    ticketId: string,
    storeId: string,
    data: {
      status: string;
      resolution?: string | null;
    },
  ) {
    return db
      .update(supportTickets)
      .set({
        status: data.status,
        resolution: data.resolution ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.storeId, storeId)))
      .returning();
  },
};
