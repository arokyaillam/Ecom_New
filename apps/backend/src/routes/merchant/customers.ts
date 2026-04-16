// Merchant Customers Routes - Customer listing, detail, create
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { customerService } from '../../services/customer.service.js';

const listQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});

const createCustomerSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and number',
  ),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  addresses: z.array(z.strictObject({
    name: z.string().min(1).max(255),
    firstName: z.string().min(1).max(255),
    lastName: z.string().min(1).max(255),
    addressLine1: z.string().min(1).max(500),
    addressLine2: z.string().max(500).optional(),
    city: z.string().min(1).max(255),
    state: z.string().max(255).optional(),
    country: z.string().min(1).max(255),
    postalCode: z.string().min(1).max(20),
    phone: z.string().max(50).optional(),
    isDefault: z.boolean().default(false),
  })).optional(),
});

const updateCustomerSchema = z.strictObject({
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  avatarUrl: z.string().optional(),
  marketingEmails: z.boolean().optional(),
});

export default async function merchantCustomersRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/customers
  fastify.get('/', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await customerService.findByStoreId(request.storeId, query);
    return result;
  });

  // POST /api/v1/merchant/customers
  fastify.post('/', async (request, reply) => {
    const parsed = createCustomerSchema.parse(request.body);
    const customer = await customerService.create({
      ...parsed,
      storeId: request.storeId,
    });
    reply.status(201).send({ customer });
  });

  // GET /api/v1/merchant/customers/:id
  fastify.get('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const customer = await customerService.findById(id, request.storeId);
    return { customer };
  });

  // PATCH /api/v1/merchant/customers/:id
  fastify.patch('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateCustomerSchema.parse(request.body);
    // Filter out undefined values to match service type expectations
    const updateData: Record<string, string | boolean> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) {
        updateData[key] = value as string | boolean;
      }
    }
    const customer = await customerService.update(id, request.storeId, updateData as Parameters<typeof customerService.update>[2]);
    return { customer };
  });
}