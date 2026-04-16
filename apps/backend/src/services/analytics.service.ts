// Analytics Service - Store analytics (dashboard data)
import { db } from '../db/index.js';
import { orders, customers, products } from '../db/schema.js';
import { eq, and, sql, count, gte, lte } from 'drizzle-orm';

export const analyticsService = {
  async getDashboardStats(storeId: string) {
    const [
      orderStats,
      customerCount,
      productCount,
      revenueStats,
    ] = await Promise.all([
      // Total orders count
      db.select({ count: count() })
        .from(orders)
        .where(eq(orders.storeId, storeId)),

      // Total customers count
      db.select({ count: count() })
        .from(customers)
        .where(eq(customers.storeId, storeId)),

      // Total products count
      db.select({ count: count() })
        .from(products)
        .where(eq(products.storeId, storeId)),

      // Total revenue (sum of all order totals)
      db.select({
        totalRevenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
        averageOrderValue: sql<string>`COALESCE(AVG(${orders.total}), 0)`,
      })
        .from(orders)
        .where(and(
          eq(orders.storeId, storeId),
          sql`${orders.status} != 'cancelled'`,
        )),
    ]);

    // Recent orders count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrders = await db.select({ count: count() })
      .from(orders)
      .where(and(
        eq(orders.storeId, storeId),
        gte(orders.createdAt, thirtyDaysAgo),
      ));

    // Recent revenue (last 30 days)
    const recentRevenue = await db.select({
      totalRevenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
    })
      .from(orders)
      .where(and(
        eq(orders.storeId, storeId),
        sql`${orders.status} != 'cancelled'`,
        gte(orders.createdAt, thirtyDaysAgo),
      ));

    return {
      totalOrders: orderStats[0]?.count ?? 0,
      totalRevenue: revenueStats[0]?.totalRevenue ?? '0',
      totalCustomers: customerCount[0]?.count ?? 0,
      totalProducts: productCount[0]?.count ?? 0,
      averageOrderValue: revenueStats[0]?.averageOrderValue ?? '0',
      recentOrders: recentOrders[0]?.count ?? 0,
      recentRevenue: recentRevenue[0]?.totalRevenue ?? '0',
    };
  },

  async getRevenueByPeriod(storeId: string, period: 'daily' | 'weekly' | 'monthly', opts?: { startDate?: Date; endDate?: Date }) {
    const endDate = opts?.endDate ?? new Date();
    const startDate = opts?.startDate ?? (() => {
      const d = new Date();
      if (period === 'daily') d.setDate(d.getDate() - 30);
      else if (period === 'weekly') d.setDate(d.getDate() - 90);
      else d.setMonth(d.getMonth() - 12);
      return d;
    })();

    // PostgreSQL to_char format must be a SQL literal, not a parameter
    let dateFormat: string;
    if (period === 'daily') {
      dateFormat = 'YYYY-MM-DD';
    } else if (period === 'weekly') {
      dateFormat = 'IYYY-IW';
    } else {
      dateFormat = 'YYYY-MM';
    }

    const periodExpr = sql<string>`to_char(${orders.createdAt}, ${sql.raw(`'${dateFormat}'`)})`;

    const results = await db.select({
      period: periodExpr,
      revenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
      orderCount: count(),
      averageOrderValue: sql<string>`COALESCE(AVG(${orders.total}), 0)`,
    })
      .from(orders)
      .where(and(
        eq(orders.storeId, storeId),
        sql`${orders.status} != 'cancelled'`,
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
      ))
      .groupBy(periodExpr)
      .orderBy(periodExpr);

    return results.map((row) => ({
      period: row.period,
      revenue: row.revenue,
      orderCount: Number(row.orderCount),
      averageOrderValue: row.averageOrderValue,
    }));
  },
};