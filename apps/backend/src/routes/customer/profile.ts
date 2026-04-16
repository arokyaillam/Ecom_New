// Customer Profile Routes - View and update profile
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { customerService } from '../../services/customer.service.js';

const updateProfileSchema = z.strictObject({
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  avatarUrl: z.string().optional(),
  marketingEmails: z.boolean().optional(),
});

export default async function customerProfileRoutes(fastify: FastifyInstance) {
  // GET /api/v1/customer/profile
  fastify.get('/', {
    schema: {
      tags: ['Customer Profile'],
      summary: 'Get profile',
      description: 'Retrieve the authenticated customer profile details',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const customer = await customerService.findById(request.customerId!, request.storeId);
    return { customer };
  });

  // PATCH /api/v1/customer/profile
  fastify.patch('/', {
    schema: {
      tags: ['Customer Profile'],
      summary: 'Update profile',
      description: 'Partial update of the authenticated customer profile',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const parsed = updateProfileSchema.parse(request.body);
    // Filter out undefined values
    const updateData: Record<string, string | boolean> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) {
        updateData[key] = value as string | boolean;
      }
    }
    const customer = await customerService.update(
      request.customerId!,
      request.storeId,
      updateData as Parameters<typeof customerService.update>[2],
    );
    return { customer };
  });
}