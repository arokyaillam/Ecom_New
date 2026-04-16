// Merchant Scope - Authentication required
// Store owners and staff - manage products, orders, settings

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ErrorCodes } from '../errors/codes.js';

export default async function merchantScope(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  // JWT verification hook - runs on ALL merchant routes EXCEPT login/register/logout
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip auth for login, register, and logout routes only
    const url = request.url;
    if (url.endsWith('/auth/login') || url.endsWith('/auth/register') || url.endsWith('/auth/logout')) {
      return;
    }
    try {
      const decoded = await request.jwtVerify() as Record<string, string>;

      // Verify storeId from JWT
      if (!decoded.storeId) {
        reply.status(401).send({
          error: 'Unauthorized',
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Invalid token',
        });
        return;
      }

      // CRITICAL: Check store status (NEVER skip this)
      const store = await fastify.storeService.findById(decoded.storeId);
      if (!store) {
        reply.status(404).send({
          error: 'Not Found',
          code: ErrorCodes.STORE_NOT_FOUND,
          message: 'Store not found',
        });
        return;
      }
      if (store.status !== 'active') {
        reply.status(403).send({
          error: 'Forbidden',
          code: ErrorCodes.STORE_SUSPENDED,
          message: `Store is ${store.status}`,
        });
        return;
      }

      // Check plan expiration
      if (store.planExpiresAt && new Date(store.planExpiresAt) < new Date()) {
        reply.status(403).send({
          error: 'Forbidden',
          code: ErrorCodes.PLAN_EXPIRED,
          message: 'Plan expired',
        });
        return;
      }

      // Attach to request for route handlers
      request.storeId = decoded.storeId;
      request.userId = decoded.userId;
      request.userRole = decoded.role;
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

  // Register merchant routes
  fastify.register(import('../routes/merchant/auth.js'), { prefix: '/auth' });
  fastify.register(import('../routes/merchant/store.js'), { prefix: '/store' });
  fastify.register(import('../routes/merchant/products.js'), { prefix: '/products' });
  fastify.register(import('../routes/merchant/categories.js'), { prefix: '/categories' });
  fastify.register(import('../routes/merchant/modifiers.js'), { prefix: '/modifiers' });
  fastify.register(import('../routes/merchant/orders.js'), { prefix: '/orders' });
  fastify.register(import('../routes/merchant/customers.js'), { prefix: '/customers' });
  fastify.register(import('../routes/merchant/reviews.js'), { prefix: '/reviews' });
  fastify.register(import('../routes/merchant/coupons.js'), { prefix: '/coupons' });
  fastify.register(import('../routes/merchant/analytics.js'), { prefix: '/analytics' });
  fastify.register(import('../routes/merchant/upload.js'), { prefix: '/upload' });
}