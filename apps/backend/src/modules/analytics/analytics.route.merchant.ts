// Merchant Analytics Routes - Dashboard stats and revenue data
import { FastifyInstance } from 'fastify';
import { analyticsService } from './analytics.service.js';
import { revenueQuerySchema } from './analytics.schema.js';

export default async function merchantAnalyticsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/analytics/dashboard
  fastify.get('/dashboard', {
    schema: {
      tags: ['Merchant Analytics'],
      summary: 'Get dashboard stats',
      description: 'Retrieve dashboard statistics for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const stats = await analyticsService.getDashboardStats(request.storeId);
    return { stats };
  });

  // GET /api/v1/merchant/analytics/revenue
  fastify.get('/revenue', {
    schema: {
      tags: ['Merchant Analytics'],
      summary: 'Get revenue data',
      description: 'Retrieve revenue data grouped by period for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
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