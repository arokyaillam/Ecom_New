// SuperAdmin Scope - Authentication required
// Platform administrators - merchant approval, plans, analytics

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ErrorCodes } from '../errors/codes.js';

export default async function superAdminScope(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  // SuperAdmin JWT verification hook - runs on ALL admin routes EXCEPT login/logout
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip auth for login and logout routes only
    const url = request.url;
    if (url.endsWith('/auth/login') || url.endsWith('/auth/logout')) {
      return;
    }
    try {
      const decoded = await request.jwtVerify() as Record<string, string>;

      // Verify superAdmin token
      if (!decoded.superAdminId) {
        reply.status(401).send({
          error: 'Unauthorized',
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Invalid token',
        });
        return;
      }

      // Attach to request
      request.superAdminId = decoded.superAdminId;
      request.adminRole = decoded.role;
    } catch (err) {
      fastify.log.warn({ err }, 'Authentication failed');
      reply.status(401).send({
        error: 'Unauthorized',
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Invalid token',
      });
      return;
    }
  });

  // Register superAdmin routes
  fastify.register(import('../routes/superAdmin/auth.js'), { prefix: '/auth' });
  fastify.register(import('../routes/superAdmin/merchants.js'), { prefix: '/merchants' });
  fastify.register(import('../routes/superAdmin/plans.js'), { prefix: '/plans' });
  fastify.register(import('../routes/superAdmin/stores.js'), { prefix: '/stores' });
}