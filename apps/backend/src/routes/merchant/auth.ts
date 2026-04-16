// Merchant Auth Routes - Login, Register, Logout, Verify Email, Password Reset
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService } from '../../services/auth.service.js';
import { authResetService } from '../../services/authReset.service.js';
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
  fastify.post('/login', {
    config: {
      rateLimit: { max: 5, timeWindow: '1 minute' },
    },
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Login as merchant',
      description: 'Authenticate a merchant user with email and password to receive an httpOnly session cookie',
    },
  }, async (request, reply) => {
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
  fastify.post('/register', {
    config: {
      rateLimit: { max: 3, timeWindow: '1 minute' },
    },
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Register a merchant',
      description: 'Create a new merchant account with store, owner, and domain details',
    },
  }, async (request, reply) => {
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
  fastify.post('/logout', {
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Logout as merchant',
      description: 'Clear the merchant session cookie and end the authenticated session',
    },
  }, async (_request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { success: true };
  });

  // GET /api/v1/merchant/auth/me
  fastify.get('/me', {
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Get current merchant user',
      description: 'Retrieve the currently authenticated merchant user profile',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
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

  // ─── Email Verification ───

  const verifyEmailSchema = z.strictObject({ token: z.string().min(1) });
  const emailSchema = z.strictObject({ email: z.email() });
  const resetPasswordSchema = z.strictObject({
    token: z.string().min(1),
    password: z.string().min(8).regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number',
    ),
  });

  // POST /api/v1/merchant/auth/verify-email
  fastify.post('/verify-email', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Verify merchant email',
      description: 'Verify a merchant email address using the token sent via email',
    },
  }, async (request) => {
    const { token } = verifyEmailSchema.parse(request.body);
    const result = await authResetService.verifyEmail(token);
    return { success: true, ...result };
  });

  // POST /api/v1/merchant/auth/forgot-password
  fastify.post('/forgot-password', {
    config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Request password reset',
      description: 'Request a password reset token sent to the merchant email',
    },
  }, async (request) => {
    const { email } = emailSchema.parse(request.body);
    await authResetService.requestPasswordReset(email, undefined, 'merchant');
    // Always return success to prevent email enumeration
    // TODO: Queue reset email via emailService
    return { success: true, message: 'If an account with that email exists, a reset link has been sent' };
  });

  // POST /api/v1/merchant/auth/reset-password
  fastify.post('/reset-password', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Reset password',
      description: 'Reset merchant password using the token from the reset email',
    },
  }, async (request) => {
    const { token, password } = resetPasswordSchema.parse(request.body);
    const result = await authResetService.resetPassword(token, password);
    return { success: true, ...result };
  });
}