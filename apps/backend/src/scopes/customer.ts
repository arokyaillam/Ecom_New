// Customer Scope - Authentication required
// Registered customers - wishlist, orders, reviews, checkout

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ErrorCodes } from '../errors/codes.js';

export default async function customerScope(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  // Customer JWT verification hook - runs on ALL customer routes EXCEPT login/register/logout
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip auth for login, register, logout, verify-email, forgot-password, reset-password, refresh
    // NOTE: resend-verification REQUIRES auth (needs customerId from JWT)
    const url = request.url;
    if (
      url.endsWith('/auth/login') ||
      url.endsWith('/auth/register') ||
      url.endsWith('/auth/logout') ||
      url.endsWith('/auth/verify-email') ||
      url.endsWith('/auth/forgot-password') ||
      url.endsWith('/auth/reset-password') ||
      url.endsWith('/auth/refresh')
    ) {
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

  // Register customer routes (from modules/)
  fastify.register(import('../modules/auth/auth.route.customer.js'), { prefix: '/auth' });
  fastify.register(import('../modules/customer/customer.route.customer.js'), { prefix: '/profile' });
  fastify.register(import('../modules/order/order.route.customer.js'), { prefix: '/orders' });
  fastify.register(import('../modules/checkout/checkout.route.customer.js'), { prefix: '/checkout' });
  fastify.register(import('../modules/coupon/coupon.route.customer.js'), { prefix: '/coupons' });
  fastify.register(import('../modules/wishlist/wishlist.route.customer.js'), { prefix: '/wishlist' });
  fastify.register(import('../modules/review/review.route.customer.js'), { prefix: '/reviews' });
  fastify.register(import('../modules/address/address.route.customer.js'), { prefix: '/addresses' });
  fastify.register(import('../modules/payment/payment.route.customer.js'), { prefix: '/payments' });
}