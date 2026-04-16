// Merchant Auth Routes - Login, Register, Logout
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService } from '../../services/auth.service.js';
import { ErrorCodes } from '../../errors/codes.js';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const loginSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(1),
});

const registerSchema = z.strictObject({
  storeName: z.string().min(1).max(255),
  domain: z.string().min(1).max(255),
  ownerEmail: z.email(),
  ownerName: z.string().max(255).optional(),
  ownerPhone: z.string().max(50).optional(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and number',
  ),
});

export default async function merchantAuthRoutes(fastify: FastifyInstance) {
  // POST /api/v1/merchant/auth/login
  fastify.post('/login', async (request, reply) => {
    const parsed = loginSchema.parse(request.body);

    const user = await authService.verifyMerchantCredentials(parsed.email, parsed.password);

    // Generate JWT
    const token = await reply.jwtSign({
      userId: user.id,
      storeId: user.storeId,
      role: user.role,
    });

    // Set httpOnly cookie - NEVER return token in body
    reply.setCookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  });

  // POST /api/v1/merchant/auth/register
  fastify.post('/register', async (request, reply) => {
    const parsed = registerSchema.parse(request.body);

    const { store, user } = await authService.registerMerchant(parsed);

    const token = await reply.jwtSign({
      userId: user.id,
      storeId: store.id,
      role: user.role,
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
      store: {
        id: store.id,
        name: store.name,
        domain: store.domain,
        status: store.status,
      },
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  });

  // POST /api/v1/merchant/auth/logout
  fastify.post('/logout', async (_request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { success: true };
  });

  // GET /api/v1/merchant/auth/me
  fastify.get('/me', async (request, reply) => {
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, request.userId),
    });

    if (!currentUser) {
      reply.status(404).send({
        error: 'Not Found',
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
      return;
    }

    return {
      user: {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
      },
    };
  });
}