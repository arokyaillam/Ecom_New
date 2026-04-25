// Analytics Service - Store analytics (dashboard data)
import * as repo from './analytics.repo.js';

export const analyticsService = {
  async getDashboardStats(storeId: string) {
    const [
      orderStats,
      customerCount,
      productCount,
      revenueStats,
    ] = await Promise.all([
      repo.countOrders(storeId),
      repo.countCustomers(storeId),
      repo.countProducts(storeId),
      repo.getRevenueStats(storeId),
    ]);

    // Recent orders count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrders = await repo.countRecentOrders(storeId, thirtyDaysAgo);

    // Recent revenue (last 30 days)
    const recentRevenue = await repo.getRecentRevenue(storeId, thirtyDaysAgo);

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

  async getRevenueByPeriod(
    storeId: string,
    period: 'daily' | 'weekly' | 'monthly',
    opts?: { startDate?: Date; endDate?: Date },
  ) {
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

    const periodExpr = repo.buildPeriodExpr(dateFormat);

    const results = await repo.getRevenueByPeriod(
      storeId,
      periodExpr,
      startDate,
      endDate,
    );

    return results.map((row) => ({
      period: row.period,
      revenue: row.revenue,
      orderCount: Number(row.orderCount),
      averageOrderValue: row.averageOrderValue,
    }));
  },

  async getBestSellers(
    storeId: string,
    opts: { limit?: number; startDate?: Date; endDate?: Date },
  ) {
    const limit = opts.limit ?? 10;
    const results = await repo.getBestSellers(
      storeId,
      limit,
      opts.startDate,
      opts.endDate,
    );

    return results.map((row) => ({
      productId: row.productId,
      productTitle: row.productTitle,
      totalQuantity: Number(row.totalQuantity),
      totalRevenue: row.totalRevenue,
    }));
  },

  async getCustomerRetention(
    storeId: string,
    period: 'daily' | 'weekly' | 'monthly',
    opts?: { startDate?: Date; endDate?: Date },
  ) {
    const endDate = opts?.endDate ?? new Date();
    const startDate = opts?.startDate ?? (() => {
      const d = new Date();
      if (period === 'daily') d.setDate(d.getDate() - 30);
      else if (period === 'weekly') d.setDate(d.getDate() - 90);
      else d.setMonth(d.getMonth() - 12);
      return d;
    })();

    let dateFormat: string;
    if (period === 'daily') {
      dateFormat = 'YYYY-MM-DD';
    } else if (period === 'weekly') {
      dateFormat = 'IYYY-IW';
    } else {
      dateFormat = 'YYYY-MM';
    }

    const rows = await repo.getCustomerOrdersByPeriod(
      storeId,
      dateFormat,
      startDate,
      endDate,
    );

    // Group customers by period
    const customersByPeriod = new Map<string, Set<string>>();
    for (const row of rows) {
      const set = customersByPeriod.get(row.period) ?? new Set<string>();
      if (row.customerId) {
        set.add(row.customerId);
      }
      customersByPeriod.set(row.period, set);
    }

    const periods = Array.from(customersByPeriod.keys()).sort();

    return periods.map((periodKey, index) => {
      const currentCustomers = customersByPeriod.get(periodKey) ?? new Set<string>();
      const previousCustomers = index > 0 ? (customersByPeriod.get(periods[index - 1]) ?? new Set<string>()) : new Set<string>();

      const totalCustomers = currentCustomers.size;
      let returningCustomers = 0;
      for (const customerId of currentCustomers) {
        if (previousCustomers.has(customerId)) {
          returningCustomers++;
        }
      }

      const retentionRate = totalCustomers > 0
        ? Number(((returningCustomers / totalCustomers) * 100).toFixed(2))
        : 0;

      return {
        period: periodKey,
        totalCustomers,
        returningCustomers,
        retentionRate,
      };
    });
  },

  async getConversionFunnel(
    storeId: string,
    opts?: { startDate?: Date; endDate?: Date },
  ) {
    const counts = await repo.getFunnelCounts(
      storeId,
      opts?.startDate,
      opts?.endDate,
    );

    const stages = [
      { stage: 'visits', count: counts.totalCarts },
      { stage: 'addToCart', count: counts.cartsWithItems },
      { stage: 'checkoutStarted', count: counts.totalOrders },
      { stage: 'paid', count: counts.paidOrders },
    ];

    return stages.map((s, index) => {
      const previousCount = index > 0 ? stages[index - 1].count : s.count;
      const percentage = previousCount > 0
        ? Number(((s.count / previousCount) * 100).toFixed(2))
        : 0;
      return {
        stage: s.stage,
        count: s.count,
        percentage,
      };
    });
  },

  async getOrderTrends(
    storeId: string,
    period: 'daily' | 'weekly' | 'monthly',
    opts?: { startDate?: Date; endDate?: Date },
  ) {
    const endDate = opts?.endDate ?? new Date();
    const startDate = opts?.startDate ?? (() => {
      const d = new Date();
      if (period === 'daily') d.setDate(d.getDate() - 30);
      else if (period === 'weekly') d.setDate(d.getDate() - 90);
      else d.setMonth(d.getMonth() - 12);
      return d;
    })();

    let dateFormat: string;
    if (period === 'daily') {
      dateFormat = 'YYYY-MM-DD';
    } else if (period === 'weekly') {
      dateFormat = 'IYYY-IW';
    } else {
      dateFormat = 'YYYY-MM';
    }

    const periodExpr = repo.buildPeriodExpr(dateFormat);

    const results = await repo.getOrderTrends(
      storeId,
      periodExpr,
      startDate,
      endDate,
    );

    return results.map((row) => ({
      period: row.period,
      orderCount: Number(row.orderCount),
    }));
  },
};
