// Payment repository — DB-only operations, no business logic
import { db } from '../../db/index.js';
import { paymentProviders, payments, paymentRefunds, paymentDisputes } from '../../db/schema.js';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

// ─── Provider queries ───

export async function findProvidersByStoreId(storeId: string) {
  return db.query.paymentProviders.findMany({
    where: eq(paymentProviders.storeId, storeId),
  });
}

export async function findProvider(storeId: string, provider: string) {
  return db.query.paymentProviders.findFirst({
    where: and(
      eq(paymentProviders.storeId, storeId),
      eq(paymentProviders.provider, provider),
    ),
  });
}

export async function upsertProvider(
  storeId: string,
  provider: string,
  data: { isEnabled: boolean; config?: Record<string, string> | string },
) {
  const existing = await findProvider(storeId, provider);
  const configValue = typeof data.config === 'string' ? null : data.config;

  if (existing) {
    const [updated] = await db
      .update(paymentProviders)
      .set({
        isEnabled: data.isEnabled,
        config: configValue as Record<string, string> | null | undefined,
        updatedAt: new Date(),
      })
      .where(and(
        eq(paymentProviders.storeId, storeId),
        eq(paymentProviders.provider, provider),
      ))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(paymentProviders)
    .values({
      storeId,
      provider,
      isEnabled: data.isEnabled,
      config: configValue as Record<string, string> | null | undefined,
    })
    .returning();
  return inserted;
}

// ─── Payment queries ───

export async function insertPayment(
  data: typeof payments.$inferInsert,
  tx?: DbOrTx,
) {
  const executor = tx ?? db;
  const [payment] = await executor.insert(payments).values(data).returning();
  return payment;
}

export async function findPaymentById(id: string, storeId: string) {
  return db.query.payments.findFirst({
    where: and(eq(payments.id, id), eq(payments.storeId, storeId)),
    with: {
      order: {
        columns: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          currency: true,
        },
      },
    },
  });
}

export async function findPaymentByOrderId(orderId: string, storeId: string) {
  return db.query.payments.findFirst({
    where: and(eq(payments.orderId, orderId), eq(payments.storeId, storeId)),
  });
}

export async function findPaymentsByStoreId(
  storeId: string,
  opts: { page: number; limit: number; status?: string; orderId?: string; search?: string },
) {
  const conditions = [eq(payments.storeId, storeId)];
  if (opts.status) {
    conditions.push(eq(payments.status, opts.status));
  }
  if (opts.orderId) {
    conditions.push(eq(payments.orderId, opts.orderId));
  }
  if (opts.search) {
    conditions.push(
      sql`${payments.providerPaymentId} ILIKE ${`%${opts.search}%`}`,
    );
  }
  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [rows, totalResult] = await Promise.all([
    db.query.payments.findMany({
      where,
      orderBy: desc(payments.createdAt),
      limit: opts.limit,
      offset: (opts.page - 1) * opts.limit,
      with: {
        order: {
          columns: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            currency: true,
          },
        },
      },
    }),
    db.select({ count: count() }).from(payments).where(where),
  ]);

  return {
    items: rows,
    total: totalResult[0]?.count ?? 0,
  };
}

export async function updatePaymentStatus(
  id: string,
  storeId: string,
  data: {
    status?: string;
    providerPaymentId?: string;
    metadata?: Record<string, unknown>;
  },
  tx?: DbOrTx,
) {
  const executor = tx ?? db;
  const [updated] = await executor
    .update(payments)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(payments.id, id), eq(payments.storeId, storeId)))
    .returning();
  return updated;
}

// ─── Refund queries ───

export async function createRefund(
  data: typeof paymentRefunds.$inferInsert,
  tx?: DbOrTx,
) {
  const executor = tx ?? db;
  const [refund] = await executor.insert(paymentRefunds).values(data).returning();
  return refund;
}

export async function findRefundsByPaymentId(paymentId: string) {
  return db.query.paymentRefunds.findMany({
    where: eq(paymentRefunds.paymentId, paymentId),
    orderBy: desc(paymentRefunds.createdAt),
  });
}

// ─── Dispute queries ───

export async function createDispute(
  data: typeof paymentDisputes.$inferInsert,
  tx?: DbOrTx,
) {
  const executor = tx ?? db;
  const [dispute] = await executor.insert(paymentDisputes).values(data).returning();
  return dispute;
}

export async function findDisputesByStoreId(
  storeId: string,
  opts: { page: number; limit: number; status?: string },
) {
  const conditions = [eq(paymentDisputes.storeId, storeId)];
  if (opts.status) {
    conditions.push(eq(paymentDisputes.status, opts.status));
  }
  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [rows, totalResult] = await Promise.all([
    db.query.paymentDisputes.findMany({
      where,
      orderBy: desc(paymentDisputes.createdAt),
      limit: opts.limit,
      offset: (opts.page - 1) * opts.limit,
      with: {
        payment: {
          columns: {
            id: true,
            provider: true,
            amount: true,
            currency: true,
            status: true,
          },
        },
        order: {
          columns: {
            id: true,
            orderNumber: true,
          },
        },
      },
    }),
    db.select({ count: count() }).from(paymentDisputes).where(where),
  ]);

  return {
    items: rows,
    total: totalResult[0]?.count ?? 0,
  };
}
