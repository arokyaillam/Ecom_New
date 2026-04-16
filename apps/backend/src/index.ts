// SaaS E-commerce API - Main Entry Point

import 'dotenv/config';
import Fastify from 'fastify';
import { env } from './config/env.js';
import plugins from './plugins/index.js';
import publicScope from './scopes/public.js';
import merchantScope from './scopes/merchant.js';
import customerScope from './scopes/customer.js';
import superAdminScope from './scopes/superAdmin.js';
import { db, client } from './db/index.js';
import { createCacheService } from './services/cache.service.js';
import { createQueueService } from './services/queue.service.js';
import { createEmailService } from './services/email.service.js';
import { createUploadService } from './services/upload.service.js';
import { storeService } from './services/store.service.js';
import { sql } from 'drizzle-orm';

const fastify = Fastify({
  logger: { level: env.LOG_LEVEL },
  trustProxy: env.isProduction ? 1 : true,
});

// Register plugins
await fastify.register(plugins);

// Decorate services
const cacheService = createCacheService(fastify.redis);
const queueService = createQueueService(env.REDIS_URL);
const emailService = createEmailService(queueService.emailQueue);
const uploadService = createUploadService();
fastify.decorate('cacheService', cacheService);
fastify.decorate('queueService', queueService);
fastify.decorate('emailService', emailService);
fastify.decorate('uploadService', uploadService);
fastify.decorate('storeService', storeService);

// Health check endpoints (no auth)
fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));

fastify.get('/health/ready', async (_request, reply) => {
  try {
    await db.execute(sql`SELECT 1`);
    await fastify.redis.ping();
    return { status: 'ready' };
  } catch (err) {
    fastify.log.error(err, 'Health check failed');
    reply.status(503).send({ status: 'not ready', error: 'Service unavailable' });
  }
});

// Register scopes (each is encapsulated)
await fastify.register(publicScope, { prefix: '/api/v1/public' });
await fastify.register(merchantScope, { prefix: '/api/v1/merchant' });
await fastify.register(customerScope, { prefix: '/api/v1/customer' });
await fastify.register(superAdminScope, { prefix: '/api/v1/admin' });

// Error handler
fastify.setErrorHandler((error: unknown, _request, reply) => {
  // Handle Zod validation errors as 400 Bad Request
  if (error && typeof error === 'object' && 'issues' in (error as object)) {
    const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
    reply.status(400).send({
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      message: zodError.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    });
    return;
  }

  // Handle custom error codes (thrown by services with .code property)
  fastify.log.error(error);
  const err = error instanceof Error ? error : new Error(String(error));
  const statusCode = 'statusCode' in err ? (err as unknown as { statusCode: number }).statusCode : 500;
  const code = 'code' in err ? (err as unknown as { code: string }).code : undefined;

  reply.status(statusCode).send({
    error: err.name || 'Internal Server Error',
    ...(code ? { code } : {}),
    message: env.isProduction ? 'An error occurred' : err.message,
  });
});

// Start server
try {
  await fastify.listen({ port: Number(env.PORT), host: env.HOST });
  fastify.log.info(`Server listening on port ${env.PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
for (const signal of signals) {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await queueService.closeAll();
      await fastify.close();
      await client.end();
      fastify.log.info('Server shut down successfully');
      process.exit(0);
    } catch (err) {
      fastify.log.error(err, 'Error during shutdown');
      process.exit(1);
    }
  });
}

export default fastify;