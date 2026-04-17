// SuperAdmin Routes - Merchants management, Plans CRUD
import { FastifyInstance } from 'fastify';
import { merchantListQuerySchema, idParamSchema } from './superAdmin.schema.js';
import { superAdminService } from './superAdmin.service.js';

export default async function superAdminRoutes(fastify: FastifyInstance) {
  // ──────────────────────────────────────
  // Merchants management
  // ──────────────────────────────────────

  // GET /api/v1/admin/merchants - List all stores
  fastify.get('/', {
    schema: {
      tags: ['SuperAdmin Merchants'],
      summary: 'List merchants',
      description: 'List all merchant stores with optional status filter and pagination',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = merchantListQuerySchema.parse(request.query);
    const result = await superAdminService.listStores(query);
    return result;
  });

  // GET /api/v1/admin/merchants/:id - Get store detail
  fastify.get('/:id', {
    schema: {
      tags: ['SuperAdmin Merchants'],
      summary: 'Get merchant detail',
      description: 'Retrieve detailed information for a specific merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const store = await superAdminService.getStore(id);
    return { store };
  });

  // PATCH /api/v1/admin/merchants/:id/approve - Approve a store
  fastify.patch('/:id/approve', {
    schema: {
      tags: ['SuperAdmin Merchants'],
      summary: 'Approve merchant',
      description: 'Approve a pending merchant store to activate it on the platform',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const store = await superAdminService.approveStore(id, request.superAdminId!);
    return { store };
  });

  // PATCH /api/v1/admin/merchants/:id/suspend - Suspend a store
  fastify.patch('/:id/suspend', {
    schema: {
      tags: ['SuperAdmin Merchants'],
      summary: 'Suspend merchant',
      description: 'Suspend an active merchant store, disabling access for its users',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const store = await superAdminService.suspendStore(id);
    return { store };
  });

  // PATCH /api/v1/admin/merchants/:id/reactivate - Reactivate a suspended store
  fastify.patch('/:id/reactivate', {
    schema: {
      tags: ['SuperAdmin Merchants'],
      summary: 'Reactivate merchant',
      description: 'Reactivate a previously suspended merchant store, restoring access for its users',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const store = await superAdminService.reactivateStore(id);
    return { store };
  });
}