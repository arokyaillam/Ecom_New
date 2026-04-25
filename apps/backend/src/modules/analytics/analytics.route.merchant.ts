// Merchant Analytics Routes - Dashboard stats and revenue data
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { analyticsService } from './analytics.service.js';
import {
  revenueQuerySchema,
  bestSellersQuerySchema,
  retentionQuerySchema,
  funnelQuerySchema,
  orderTrendsQuerySchema,
} from './analytics.schema.js';

export default async function merchantAnalyticsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/analytics/dashboard
  fastify.get('/dashboard', {
    preHandler: requirePermission('analytics:read'),
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
    preHandler: requirePermission('analytics:read'),
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

  // GET /api/v1/merchant/analytics/best-sellers
  fastify.get('/best-sellers', {
    preHandler: requirePermission('analytics:read'),
    schema: {
      tags: ['Merchant Analytics'],
      summary: 'Get best sellers',
      description: 'Retrieve top selling products by quantity for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = bestSellersQuerySchema.parse(request.query);
    const data = await analyticsService.getBestSellers(request.storeId, {
      limit: query.limit,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
    return { data };
  });

  // GET /api/v1/merchant/analytics/retention
  fastify.get('/retention', {
    preHandler: requirePermission('analytics:read'),
    schema: {
      tags: ['Merchant Analytics'],
      summary: 'Get customer retention',
      description: 'Retrieve customer retention metrics by period for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = retentionQuerySchema.parse(request.query);
    const data = await analyticsService.getCustomerRetention(
      request.storeId,
      query.period,
      {
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      },
    );
    return { data };
  });

  // GET /api/v1/merchant/analytics/funnel
  fastify.get('/funnel', {
    preHandler: requirePermission('analytics:read'),
    schema: {
      tags: ['Merchant Analytics'],
      summary: 'Get conversion funnel',
      description: 'Retrieve conversion funnel counts for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = funnelQuerySchema.parse(request.query);
    const data = await analyticsService.getConversionFunnel(request.storeId, {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
    return { data };
  });

  // GET /api/v1/merchant/analytics/orders
  fastify.get('/orders', {
    preHandler: requirePermission('analytics:read'),
    schema: {
      tags: ['Merchant Analytics'],
      summary: 'Get order trends',
      description: 'Retrieve order counts grouped by period for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = orderTrendsQuerySchema.parse(request.query);
    const data = await analyticsService.getOrderTrends(
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
