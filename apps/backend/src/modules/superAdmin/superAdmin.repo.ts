// SuperAdmin repository — Drizzle queries only. No business logic, no ErrorCodes.
import { db } from '../../db/index.js';
import { stores, merchantPlans } from '../../db/schema.js';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export const superAdminRepo = {
  // ─── Store queries ───

  async findStores(opts: { page: number; limit: number; status?: string }) {
    const conditions = [];
    if (opts.status) {
      conditions.push(eq(stores.status, opts.status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalResult] = await Promise.all([
      db.query.stores.findMany({
        where,
        orderBy: desc(stores.createdAt),
        limit: opts.limit,
        offset: (opts.page - 1) * opts.limit,
      }),
      db.select({ count: count() })
        .from(stores)
        .where(where ?? sql`1=1`),
    ]);

    return {
      data: rows,
      total: totalResult[0]?.count ?? 0,
    };
  },

  async findStoreById(storeId: string) {
    return db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });
  },

  async updateStore(storeId: string, data: Partial<typeof stores.$inferInsert>, tx?: DbOrTx) {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(stores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning();
    return updated;
  },

  // ─── Plan queries ───

  async findPlans() {
    return db.query.merchantPlans.findMany({
      orderBy: desc(merchantPlans.createdAt),
    });
  },

  async findPlanById(planId: string) {
    return db.query.merchantPlans.findFirst({
      where: eq(merchantPlans.id, planId),
    });
  },

  async insertPlan(data: typeof merchantPlans.$inferInsert, tx?: DbOrTx) {
    const executor = tx ?? db;
    const [plan] = await executor.insert(merchantPlans).values(data).returning();
    return plan;
  },

  async updatePlan(planId: string, data: Partial<typeof merchantPlans.$inferInsert>, tx?: DbOrTx) {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(merchantPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(merchantPlans.id, planId))
      .returning();
    return updated;
  },

  async deletePlan(planId: string, tx?: DbOrTx) {
    const executor = tx ?? db;
    await executor.delete(merchantPlans).where(eq(merchantPlans.id, planId));
  },

  // ─── Stats queries ───

  async countStores() {
    const result = await db.select({ count: count() }).from(stores);
    return result[0]?.count ?? 0;
  },

  async countActiveStores() {
    const result = await db.select({ count: count() }).from(stores).where(eq(stores.status, 'active'));
    return result[0]?.count ?? 0;
  },

  async countPlans() {
    const result = await db.select({ count: count() }).from(merchantPlans);
    return result[0]?.count ?? 0;
  },
};