// Return repository — Drizzle queries only. No business logic, no ErrorCodes.
import { db } from '../../db/index.js';
import { returns, returnItems } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';

export const returnRepo = {
  async create(data: {
    storeId: string;
    orderId: string;
    customerId?: string;
    status: string;
    reason: string;
    notes?: string;
  }) {
    const [row] = await db.insert(returns).values(data).returning();
    return row;
  },

  async createItem(data: {
    returnId: string;
    orderItemId: string;
    quantity: number;
    reason?: string;
    condition?: string;
    refundAmount?: string;
  }) {
    const [row] = await db.insert(returnItems).values(data).returning();
    return row;
  },

  async findById(id: string) {
    const [row] = await db.select().from(returns).where(eq(returns.id, id)).limit(1);
    return row ?? null;
  },

  async findByIdWithItems(id: string) {
    const [ret] = await db.select().from(returns).where(eq(returns.id, id)).limit(1);
    if (!ret) return null;
    const items = await db.select().from(returnItems).where(eq(returnItems.returnId, id));
    return { ...ret, items };
  },

  async findByStore(storeId: string, page = 1, limit = 20) {
    const rows = await db
      .select()
      .from(returns)
      .where(eq(returns.storeId, storeId))
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy(returns.createdAt);
    return rows;
  },

  async findByOrder(orderId: string) {
    return db.select().from(returns).where(eq(returns.orderId, orderId));
  },

  async updateStatus(
    id: string,
    status: string,
    extra?: Partial<typeof returns.$inferInsert>,
  ) {
    const [row] = await db
      .update(returns)
      .set({ status, ...extra, updatedAt: new Date() })
      .where(eq(returns.id, id))
      .returning();
    return row;
  },
};
