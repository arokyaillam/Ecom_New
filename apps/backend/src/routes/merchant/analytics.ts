// Merchant Analytics Routes - Dashboard stats and revenue data
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { analyticsService } from '../../services/analytics.service.js';

const revenueQuerySchema = z.strictObject({
  period: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export default async function merchantAnalyticsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/analytics/dashboard
  fastify.get('/dashboard', async (request) => {
    const stats = await analyticsService.getDashboardStats(request.storeId);
    return { stats };
  });

  // GET /api/v1/merchant/analytics/revenue
  fastify.get('/revenue', async (request) => {
    const query = revenueQuerySchema.parse(request.query);
    const data = await analyticsService.getRevenueByPeriod(
      request.storeId,
      query.period,
      {
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      },
    );
    return { data };
  });
}