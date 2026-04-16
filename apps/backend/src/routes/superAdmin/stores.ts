// SuperAdmin Stores Routes - View and manage stores
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { superAdminService } from '../../services/superAdmin.service.js';
import { storeService } from '../../services/store.service.js';

const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});

const updateStoreSchema = z.strictObject({
  planId: z.string().uuid().nullable().optional(),
  planExpiresAt: z.string().datetime().nullable().optional(),
  status: z.enum(['pending', 'active', 'suspended']).optional(),
});

const listQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'active', 'suspended']).optional(),
});

export default async function superAdminStoresRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/stores - List all stores
  fastify.get('/', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await superAdminService.listStores(query);
    return result;
  });

  // GET /api/v1/admin/stores/stats - Platform statistics
  fastify.get('/stats', async () => {
    const stats = await superAdminService.getPlatformStats();
    return { stats };
  });

  // GET /api/v1/admin/stores/:id - Get store detail
  fastify.get('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const store = await superAdminService.getStore(id);
    return { store };
  });

  // PATCH /api/v1/admin/stores/:id - Update store (plan assignment, status)
  fastify.patch('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateStoreSchema.parse(request.body);
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) {
        if (key === 'planExpiresAt' && typeof value === 'string') {
          updateData[key] = new Date(value);
        } else {
          updateData[key] = value;
        }
      }
    }
    const store = await storeService.update(id, updateData);
    return { store };
  });
}