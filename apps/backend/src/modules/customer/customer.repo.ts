// Customer repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { customers, customerAddresses, orders } from '../../db/schema.js';
import { eq, and, desc, count, sql, inArray } from 'drizzle-orm';

type DbExecutor = typeof db;

export const customerRepo = {
  /**
   * Run multiple repo operations in a single transaction.
   * The callback receives a transaction executor that can be
   * passed to any repo method as the `tx` parameter.
   */
  async withTransaction<T>(
    callback: (tx: DbExecutor) => Promise<T>,
  ): Promise<T> {
    // PgTransaction shares the query API with PostgresJsDatabase but
    // TypeScript doesn't reflect this due to the $client property difference.
    // The cast is safe because both expose .query, .insert, .update, .delete, .select.
    return db.transaction(async (tx) => callback(tx as unknown as DbExecutor));
  },

  async findByStoreId(
    storeId: string,
    opts: { limit: number; offset: number },
    tx?: DbExecutor,
  ) {
    const executor = tx ?? db;
    const where = eq(customers.storeId, storeId);

    const [rows, totalResult] = await Promise.all([
      executor.query.customers.findMany({
        where,
        columns: {
          id: true,
          storeId: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          isVerified: true,
          isBlocked: true,
          blockedAt: true,
          blockedReason: true,
          marketingEmails: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [desc(customers.createdAt)],
        limit: opts.limit,
        offset: opts.offset,
        with: {
          addresses: true,
        },
      }),
      executor.select({ count: count() })
        .from(customers)
        .where(where),
    ]);

    return { rows, total: totalResult[0]?.count ?? 0 };
  },

  async findById(customerId: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.customers.findFirst({
      where: and(eq(customers.id, customerId), eq(customers.storeId, storeId)),
      columns: {
        id: true,
        storeId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        isVerified: true,
        isBlocked: true,
        blockedAt: true,
        blockedReason: true,
        marketingEmails: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        addresses: true,
        orders: {
          orderBy: [desc(customers.createdAt)],
          limit: 10,
        },
      },
    });
  },

  async findByEmail(email: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.customers.findFirst({
      where: and(
        eq(customers.email, email),
        eq(customers.storeId, storeId),
      ),
    });
  },

  async insertCustomer(data: typeof customers.$inferInsert, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [customer] = await executor.insert(customers).values(data).returning();
    return customer;
  },

  async insertAddresses(addresses: (typeof customerAddresses.$inferInsert)[], tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.insert(customerAddresses).values(addresses);
  },

  async updateCustomer(
    customerId: string,
    storeId: string,
    data: Partial<typeof customers.$inferInsert>,
    tx?: DbExecutor,
  ) {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(customers.id, customerId), eq(customers.storeId, storeId)))
      .returning();
    return updated;
  },

  async findFullProfileForExport(customerId: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.customers.findFirst({
      where: and(eq(customers.id, customerId), eq(customers.storeId, storeId)),
      columns: {
        id: true,
        storeId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        isVerified: true,
        isBlocked: true,
        blockedAt: true,
        blockedReason: true,
        marketingEmails: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        addresses: true,
        orders: true,
        reviews: true,
        couponUsages: true,
      },
    });
  },

  async anonymizeCustomer(customerId: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(customers)
      .set({
        email: `deleted-${customerId}@anonymized.local`,
        firstName: 'Deleted User',
        lastName: null,
        phone: null,
        avatarUrl: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        marketingEmails: false,
        isVerified: false,
        updatedAt: new Date(),
      })
      .where(and(eq(customers.id, customerId), eq(customers.storeId, storeId)))
      .returning();
    return updated;
  },

  // --- LTV + Orders ---

  async getCustomerLTV(customerId: string, storeId: string) {
    const [result] = await db
      .select({
        ltv: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, storeId),
          eq(orders.customerId, customerId),
          sql`${orders.status} != 'cancelled'`,
        ),
      );
    return result?.ltv ?? '0';
  },

  async getCustomerOrderCount(customerId: string, storeId: string) {
    const [result] = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, storeId),
          eq(orders.customerId, customerId),
          sql`${orders.status} != 'cancelled'`,
        ),
      );
    return result?.count ?? 0;
  },

  async getCustomerOrders(
    customerId: string,
    storeId: string,
    opts: { page: number; limit: number },
  ) {
    const offset = (opts.page - 1) * opts.limit;
    const [rows, totalResult] = await Promise.all([
      db.query.orders.findMany({
        where: and(eq(orders.storeId, storeId), eq(orders.customerId, customerId)),
        orderBy: [desc(orders.createdAt)],
        limit: opts.limit,
        offset,
      }),
      db.select({ count: count() })
        .from(orders)
        .where(and(eq(orders.storeId, storeId), eq(orders.customerId, customerId))),
    ]);
    return {
      data: rows,
      total: totalResult[0]?.count ?? 0,
    };
  },

  async getCustomerAggregates(customerIds: string[], storeId: string) {
    if (customerIds.length === 0) return [];
    return db
      .select({
        customerId: orders.customerId,
        ltv: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
        orderCount: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, storeId),
          inArray(orders.customerId, customerIds),
          sql`${orders.status} != 'cancelled'`,
        ),
      )
      .groupBy(orders.customerId);
  },

  // --- Block status ---

  async updateBlockedStatus(
    customerId: string,
    storeId: string,
    isBlocked: boolean,
    reason?: string,
  ) {
    const [updated] = await db
      .update(customers)
      .set({
        isBlocked,
        blockedAt: isBlocked ? new Date() : null,
        blockedReason: isBlocked ? (reason ?? null) : null,
        updatedAt: new Date(),
      })
      .where(and(eq(customers.id, customerId), eq(customers.storeId, storeId)))
      .returning();
    return updated;
  },
};
