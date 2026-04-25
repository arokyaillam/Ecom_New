// Merchant Report Routes — CSV exports
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { reportService } from './report.service.js';
import { reportDateRangeSchema } from './report.schema.js';

export default async function merchantReportRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/reports/sales?startDate=ISO&endDate=ISO
  fastify.get('/sales', {
    preHandler: requirePermission('analytics:read'),
    schema: {
      tags: ['Merchant Reports'],
      summary: 'Export sales report CSV',
      description: 'Download sales report as CSV for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const query = reportDateRangeSchema.parse(request.query);
    const csv = await reportService.generateSalesReport(request.storeId, {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="sales-report.csv"')
      .send(csv);
  });

  // GET /api/v1/merchant/reports/customers
  fastify.get('/customers', {
    preHandler: requirePermission('analytics:read'),
    schema: {
      tags: ['Merchant Reports'],
      summary: 'Export customer report CSV',
      description: 'Download customer report as CSV for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const csv = await reportService.generateCustomerReport(request.storeId);
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="customers-report.csv"')
      .send(csv);
  });

  // GET /api/v1/merchant/reports/inventory
  fastify.get('/inventory', {
    preHandler: requirePermission('analytics:read'),
    schema: {
      tags: ['Merchant Reports'],
      summary: 'Export inventory report CSV',
      description: 'Download inventory report as CSV for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const csv = await reportService.generateInventoryReport(request.storeId);
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="inventory-report.csv"')
      .send(csv);
  });

  // GET /api/v1/merchant/reports/tax?startDate=ISO&endDate=ISO
  fastify.get('/tax', {
    preHandler: requirePermission('analytics:read'),
    schema: {
      tags: ['Merchant Reports'],
      summary: 'Export tax report CSV',
      description: 'Download tax report as CSV for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const query = reportDateRangeSchema.parse(request.query);
    const csv = await reportService.generateTaxReport(request.storeId, {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="tax-report.csv"')
      .send(csv);
  });
}
