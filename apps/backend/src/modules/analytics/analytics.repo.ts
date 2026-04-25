// Analytics repository — DB-only operations, no business logic
import { db } from '../../db/index.js';
import { orders, customers, products, orderItems, carts } from '../../db/schema.js';
import { eq, and, sql, count, gte, lte } from 'drizzle-orm';

export async function countOrders(storeId: string) {
  return db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.storeId, storeId));
}

export async function countCustomers(storeId: string) {
  return db
    .select({ count: count() })
    .from(customers)
    .where(eq(customers.storeId, storeId));
}

export async function countProducts(storeId: string) {
  return db
    .select({ count: count() })
    .from(products)
    .where(eq(products.storeId, storeId));
}

export async function getRevenueStats(storeId: string) {
  return db
    .select({
      totalRevenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
      averageOrderValue: sql<string>`COALESCE(AVG(${orders.total}), 0)`,
    })
    .from(orders)
    .where(and(eq(orders.storeId, storeId), sql`${orders.status} != 'cancelled'`));
}

export async function countRecentOrders(storeId: string, since: Date) {
  return db
    .select({ count: count() })
    .from(orders)
    .where(and(eq(orders.storeId, storeId), gte(orders.createdAt, since)));
}

export async function getRecentRevenue(storeId: string, since: Date) {
  return db
    .select({
      totalRevenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, storeId),
        sql`${orders.status} != 'cancelled'`,
        gte(orders.createdAt, since),
      ),
    );
}

export function buildPeriodExpr(dateFormat: string) {
  return sql<string>`to_char(${orders.createdAt}, ${sql.raw(`'${dateFormat}'`)})`;
}

export async function getRevenueByPeriod(
  storeId: string,
  periodExpr: ReturnType<typeof sql>,
  startDate: Date,
  endDate: Date,
) {
  return db
    .select({
      period: periodExpr,
      revenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
      orderCount: count(),
      averageOrderValue: sql<string>`COALESCE(AVG(${orders.total}), 0)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, storeId),
        sql`${orders.status} != 'cancelled'`,
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
      ),
    )
    .groupBy(periodExpr)
    .orderBy(periodExpr);
}

// --- Best Sellers ---

export async function getBestSellers(
  storeId: string,
  limit: number,
  startDate?: Date,
  endDate?: Date,
) {
  const conditions = [
    eq(orderItems.storeId, storeId),
    sql`${orders.status} != 'cancelled'`,
  ];
  if (startDate) {
    conditions.push(gte(orders.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(orders.createdAt, endDate));
  }

  return db
    .select({
      productId: orderItems.productId,
      productTitle: orderItems.productTitle,
      totalQuantity: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
      totalRevenue: sql<string>`COALESCE(SUM(${orderItems.total}), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(...conditions))
    .groupBy(orderItems.productId, orderItems.productTitle)
    .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
    .limit(limit);
}

// --- Customer Retention ---

export async function getCustomerOrdersByPeriod(
  storeId: string,
  dateFormat: string,
  startDate: Date,
  endDate: Date,
) {
  const periodExpr = sql<string>`to_char(${orders.createdAt}, ${sql.raw(`'${dateFormat}'`)})`;

  return db
    .select({
      period: periodExpr,
      customerId: orders.customerId,
    })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, storeId),
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        sql`${orders.customerId} IS NOT NULL`,
      ),
    )
    .groupBy(periodExpr, orders.customerId)
    .orderBy(periodExpr);
}

// --- Conversion Funnel ---

export async function getFunnelCounts(
  storeId: string,
  startDate?: Date,
  endDate?: Date,
) {
  const cartConditions = [eq(carts.storeId, storeId)];
  const orderConditions = [eq(orders.storeId, storeId)];

  if (startDate) {
    cartConditions.push(gte(carts.createdAt, startDate));
    orderConditions.push(gte(orders.createdAt, startDate));
  }
  if (endDate) {
    cartConditions.push(lte(carts.createdAt, endDate));
    orderConditions.push(lte(orders.createdAt, endDate));
  }

  const [cartResults, orderResults] = await Promise.all([
    db
      .select({
        totalCarts: count(),
        cartsWithItems: sql<number>`COUNT(CASE WHEN ${carts.itemCount} > 0 THEN 1 END)`,
      })
      .from(carts)
      .where(and(...cartConditions)),
    db
      .select({
        totalOrders: count(),
        paidOrders: sql<number>`COUNT(CASE WHEN ${orders.status} IN ('processing', 'shipped', 'delivered') THEN 1 END)`,
      })
      .from(orders)
      .where(and(...orderConditions)),
  ]);

  return {
    totalCarts: cartResults[0]?.totalCarts ?? 0,
    cartsWithItems: cartResults[0]?.cartsWithItems ?? 0,
    totalOrders: orderResults[0]?.totalOrders ?? 0,
    paidOrders: orderResults[0]?.paidOrders ?? 0,
  };
}

// --- Order Trends ---

export async function getOrderTrends(
  storeId: string,
  periodExpr: ReturnType<typeof sql>,
  startDate: Date,
  endDate: Date,
) {
  return db
    .select({
      period: periodExpr,
      orderCount: count(),
    })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, storeId),
        sql`${orders.status} != 'cancelled'`,
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
      ),
    )
    .groupBy(periodExpr)
    .orderBy(periodExpr);
}
