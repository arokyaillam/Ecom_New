// SuperAdmin Plans Routes - CRUD for merchant plans
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { superAdminService } from '../../services/superAdmin.service.js';

const createPlanSchema = z.strictObject({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  currency: z.string().max(3).default('USD'),
  interval: z.enum(['month', 'year']).default('month'),
  features: z.array(z.string()).optional(),
  maxProducts: z.number().int().min(1).default(100),
  maxStorage: z.number().int().min(1).default(1024),
  isActive: z.boolean().default(true),
});

const updatePlanSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency: z.string().max(3).optional(),
  interval: z.enum(['month', 'year']).optional(),
  features: z.array(z.string()).nullable().optional(),
  maxProducts: z.number().int().min(1).optional(),
  maxStorage: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});

export default async function superAdminPlansRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/plans - List all plans
  fastify.get('/', {
    schema: {
      tags: ['SuperAdmin Plans'],
      summary: 'List plans',
      description: 'List all subscription plans available on the platform',
      security: [{ cookieAuth: [] }],
    },
  }, async () => {
    const plans = await superAdminService.listPlans();
    return { plans };
  });

  // POST /api/v1/admin/plans - Create a plan
  fastify.post('/', {
    schema: {
      tags: ['SuperAdmin Plans'],
      summary: 'Create plan',
      description: 'Create a new subscription plan for merchant stores',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = createPlanSchema.parse(request.body);
    const plan = await superAdminService.createPlan(parsed);
    reply.status(201).send({ plan });
  });

  // GET /api/v1/admin/plans/:id - Get plan detail
  fastify.get('/:id', {
    schema: {
      tags: ['SuperAdmin Plans'],
      summary: 'Get plan detail',
      description: 'Retrieve a single subscription plan by ID',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const plan = await superAdminService.getPlan(id);
    return { plan };
  });

  // PATCH /api/v1/admin/plans/:id - Update a plan
  fastify.patch('/:id', {
    schema: {
      tags: ['SuperAdmin Plans'],
      summary: 'Update plan',
      description: 'Partial update of a subscription plan',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updatePlanSchema.parse(request.body);
    const plan = await superAdminService.updatePlan(id, parsed);
    return { plan };
  });

  // DELETE /api/v1/admin/plans/:id - Delete a plan
  fastify.delete('/:id', {
    schema: {
      tags: ['SuperAdmin Plans'],
      summary: 'Delete plan',
      description: 'Delete a subscription plan from the platform',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await superAdminService.deletePlan(id);
    reply.status(204).send();
  });
}