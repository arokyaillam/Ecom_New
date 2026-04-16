// SuperAdmin Auth Routes - Login, Logout
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService } from '../../services/auth.service.js';
import { db } from '../../db/index.js';
import { superAdmins } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { ErrorCodes } from '../../errors/codes.js';

const loginSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(1),
});

export default async function superAdminAuthRoutes(fastify: FastifyInstance) {
  // POST /api/v1/admin/auth/login
  fastify.post('/login', async (request, reply) => {
    const parsed = loginSchema.parse(request.body);

    const admin = await authService.verifySuperAdminCredentials(parsed.email, parsed.password);

    // Update last login
    await db.update(superAdmins)
      .set({ lastLoginAt: new Date() })
      .where(eq(superAdmins.id, admin.id));

    const token = await reply.jwtSign({
      superAdminId: admin.id,
      role: 'superAdmin',
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
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    };
  });

  // POST /api/v1/admin/auth/logout
  fastify.post('/logout', async (_request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { success: true };
  });

  // GET /api/v1/admin/auth/me
  fastify.get('/me', async (request, reply) => {
    const adminId = request.superAdminId!;

    const admin = await db.query.superAdmins.findFirst({
      where: eq(superAdmins.id, adminId),
    });

    if (!admin) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.ADMIN_NOT_FOUND, message: 'Admin not found' });
      return;
    }

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        isActive: admin.isActive,
      },
    };
  });
}