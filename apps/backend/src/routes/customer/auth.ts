// Customer Auth Routes - Login, Register, Logout
import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authService } from '../../services/auth.service.js';
import { storeService } from '../../services/store.service.js';
import { db } from '../../db/index.js';
import { customers } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { ErrorCodes } from '../../errors/codes.js';

const loginSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(1),
});

const registerSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and number',
  ),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
});

export default async function customerAuthRoutes(fastify: FastifyInstance) {
  // Helper: resolve storeId from request (Host header or existing JWT)
  async function resolveStoreId(request: FastifyRequest): Promise<string | null> {
    if (request.storeId) return request.storeId;

    const rawHost = request.headers.host;
    const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
    if (host) {
      const store = await storeService.findByDomain(host);
      if (store) return store.id;
      // Try extracting subdomain
      const parts = host.split('.');
      if (parts.length > 1) {
        const subdomain = parts[0];
        const found = await storeService.findByDomain(subdomain);
        if (found) return found.id;
      }
    }
    return null;
  }

  // POST /api/v1/customer/auth/login
  fastify.post('/login', async (request, reply) => {
    const parsed = loginSchema.parse(request.body);
    const storeId = await resolveStoreId(request);

    if (!storeId) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found. Please access via your store domain.' });
      return;
    }

    const customer = await authService.verifyCustomerCredentials(
      parsed.email,
      parsed.password,
      storeId,
    );

    const token = await reply.jwtSign({
      customerId: customer.id,
      storeId: customer.storeId,
    });

    reply.setCookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return {
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    };
  });

  // POST /api/v1/customer/auth/register
  fastify.post('/register', async (request, reply) => {
    const parsed = registerSchema.parse(request.body);
    const storeId = await resolveStoreId(request);

    if (!storeId) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found. Please access via your store domain.' });
      return;
    }

    const customer = await authService.registerCustomer({
      ...parsed,
      storeId,
    });

    const token = await reply.jwtSign({
      customerId: customer.id,
      storeId: customer.storeId,
    });

    reply.setCookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    reply.status(201).send({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    });
  });

  // POST /api/v1/customer/auth/logout
  fastify.post('/logout', async (_request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { success: true };
  });

  // GET /api/v1/customer/auth/me
  fastify.get('/me', async (request, reply) => {
    const customerId = request.customerId!;

    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
      columns: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        storeId: true,
        isVerified: true,
        marketingEmails: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!customer) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.CUSTOMER_NOT_FOUND, message: 'Customer not found' });
      return;
    }

    return { customer };
  });
}