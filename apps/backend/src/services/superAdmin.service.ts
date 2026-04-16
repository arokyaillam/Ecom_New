// SuperAdmin Service - Platform administration
import { db } from '../db/index.js';
import { stores, merchantPlans } from '../db/schema.js';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { ErrorCodes } from '../errors/codes.js';

export const superAdminService = {
  // --- Merchant/Store management ---

  async listStores(opts?: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const conditions = [];
    if (opts?.status) {
      conditions.push(eq(stores.status, opts.status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalResult] = await Promise.all([
      db.query.stores.findMany({
        where,
        orderBy: desc(stores.createdAt),
        limit,
        offset,
      }),
      db.select({ count: count() })
        .from(stores)
        .where(where ?? sql`1=1`),
    ]);

    const total = totalResult[0]?.count ?? 0;

    // Strip sensitive fields
    const sanitized = rows.map(({ ownerEmail, ownerName, ownerPhone, ...rest }) => rest);

    return {
      data: sanitized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getStore(storeId: string) {
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      throw Object.assign(new Error('Store not found'), {
        code: ErrorCodes.STORE_NOT_FOUND,
      });
    }

    return store;
  },

  async approveStore(storeId: string, adminId: string) {
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      throw Object.assign(new Error('Store not found'), {
        code: ErrorCodes.STORE_NOT_FOUND,
      });
    }

    if (store.status === 'active') {
      throw Object.assign(new Error('Store is already active'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    const [updated] = await db
      .update(stores)
      .set({
        status: 'active',
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(stores.id, storeId))
      .returning();

    return updated;
  },

  async suspendStore(storeId: string) {
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      throw Object.assign(new Error('Store not found'), {
        code: ErrorCodes.STORE_NOT_FOUND,
      });
    }

    const [updated] = await db
      .update(stores)
      .set({
        status: 'suspended',
        updatedAt: new Date(),
      })
      .where(eq(stores.id, storeId))
      .returning();

    return updated;
  },

  async reactivateStore(storeId: string) {
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      throw Object.assign(new Error('Store not found'), {
        code: ErrorCodes.STORE_NOT_FOUND,
      });
    }

    const [updated] = await db
      .update(stores)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(stores.id, storeId))
      .returning();

    return updated;
  },

  // --- Plan management ---

  async listPlans() {
    return db.query.merchantPlans.findMany({
      orderBy: desc(merchantPlans.createdAt),
    });
  },

  async getPlan(planId: string) {
    const plan = await db.query.merchantPlans.findFirst({
      where: eq(merchantPlans.id, planId),
    });

    if (!plan) {
      throw Object.assign(new Error('Plan not found'), {
        code: ErrorCodes.PLAN_NOT_FOUND,
      });
    }

    return plan;
  },

  async createPlan(data: typeof merchantPlans.$inferInsert) {
    const [plan] = await db.insert(merchantPlans).values(data).returning();
    return plan;
  },

  async updatePlan(planId: string, data: Partial<typeof merchantPlans.$inferInsert>) {
    const plan = await db.query.merchantPlans.findFirst({
      where: eq(merchantPlans.id, planId),
    });

    if (!plan) {
      throw Object.assign(new Error('Plan not found'), {
        code: ErrorCodes.PLAN_NOT_FOUND,
      });
    }

    const [updated] = await db
      .update(merchantPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(merchantPlans.id, planId))
      .returning();

    return updated;
  },

  async deletePlan(planId: string) {
    const plan = await db.query.merchantPlans.findFirst({
      where: eq(merchantPlans.id, planId),
    });

    if (!plan) {
      throw Object.assign(new Error('Plan not found'), {
        code: ErrorCodes.PLAN_NOT_FOUND,
      });
    }

    await db.delete(merchantPlans).where(eq(merchantPlans.id, planId));
    return { id: planId, deleted: true };
  },

  // --- Dashboard stats ---

  async getPlatformStats() {
    const [
      storeCount,
      activeStoreCount,
      planCount,
    ] = await Promise.all([
      db.select({ count: count() }).from(stores),
      db.select({ count: count() }).from(stores).where(eq(stores.status, 'active')),
      db.select({ count: count() }).from(merchantPlans),
    ]);

    return {
      totalStores: storeCount[0]?.count ?? 0,
      activeStores: activeStoreCount[0]?.count ?? 0,
      totalPlans: planCount[0]?.count ?? 0,
    };
  },
};