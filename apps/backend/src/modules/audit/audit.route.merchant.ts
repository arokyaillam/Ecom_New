// Merchant Audit Log Routes
import { FastifyInstance } from 'fastify';
import { auditService } from './audit.service.js';
import { listAuditLogsQuerySchema } from './audit.schema.js';

export default async function merchantAuditRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/audit-logs
  fastify.get('/', {
    schema: {
      tags: ['Merchant Audit Logs'],
      summary: 'List audit logs',
      description: 'List audit logs for the authenticated merchant store with filters',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listAuditLogsQuerySchema.parse(request.query);
    return auditService.findByStoreId(request.storeId, {
      page: query.page,
      limit: query.limit,
      action: query.action,
      entityType: query.entityType,
      userId: query.userId,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  });
}
