// Customer Scope - Authentication required
// Registered customers - wishlist, orders, reviews, checkout

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ErrorCodes } from '../errors/codes.js';

export default async function customerScope(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  // Customer JWT verification hook - runs on ALL customer routes EXCEPT login/register/logout
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip auth for login, register, and logout routes only
    const url = request.url;
    if (url.endsWith('/auth/login') || url.endsWith('/auth/register') || url.endsWith('/auth/logout')) {
      return;
    }
    try {
      const decoded = await request.jwtVerify() as Record<string, string>;

      // Verify customer token has customerId and storeId
      if (!decoded.customerId || !decoded.storeId) {
        reply.status(401).send({
          error: 'Unauthorized',
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Invalid token',
        });
        return;
      }

      // Attach to request
      request.customerId = decoded.customerId;
      request.storeId = decoded.storeId;
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

  // Register customer routes
  fastify.register(import('../routes/customer/auth.js'), { prefix: '/auth' });
  fastify.register(import('../routes/customer/profile.js'), { prefix: '/profile' });
  fastify.register(import('../routes/customer/orders.js'), { prefix: '/orders' });
  fastify.register(import('../routes/customer/checkout.js'), { prefix: '/checkout' });
  fastify.register(import('../routes/customer/wishlist.js'), { prefix: '/wishlist' });
  fastify.register(import('../routes/customer/reviews.js'), { prefix: '/reviews' });
}