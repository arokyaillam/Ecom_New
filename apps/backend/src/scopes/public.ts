// Public Scope - No authentication required
// Used for storefront browsing, product viewing, cart operations

import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function publicScope(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  // Tenant resolution from Host header domain/subdomain
  fastify.addHook('onRequest', async (request, _reply) => {
    const rawHost = request.headers.host;
    const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
    if (host) {
      // Try exact match first
      const store = await fastify.storeService.findByDomain(host);
      if (store) {
        request.storeId = store.id;
        return;
      }
      // Try extracting subdomain (e.g. "techgear.localhost:3000" -> "techgear")
      const parts = host.split('.');
      if (parts.length > 1) {
        const subdomain = parts[0];
        const found = await fastify.storeService.findByDomain(subdomain);
        if (found) {
          request.storeId = found.id;
        }
      }
    }
  });

  // Register public routes
  fastify.register(import('../routes/public/store.js'), { prefix: '/store' });
  fastify.register(import('../routes/public/products.js'), { prefix: '/products' });
  fastify.register(import('../routes/public/reviews.js'), { prefix: '/reviews' });
  fastify.register(import('../routes/public/cart.js'), { prefix: '/cart' });
  fastify.register(import('../routes/public/analytics.js'), { prefix: '/analytics' });
  fastify.register(import('../routes/public/shipping.js'), { prefix: '/shipping' });
  fastify.register(import('../routes/public/tax.js'), { prefix: '/tax' });
}