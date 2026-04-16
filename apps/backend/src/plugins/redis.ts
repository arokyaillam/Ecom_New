import fp from 'fastify-plugin';
import { createRedisClient, type RedisClientType } from '../lib/redis.js';
import { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export default fp(async function redisPlugin(fastify: FastifyInstance) {
  const redis = createRedisClient(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redis.on('connect', () => {
    fastify.log.info('Redis connected');
  });

  redis.on('error', (err: unknown) => {
    fastify.log.error({ err }, 'Redis connection error');
  });

  // Decorate fastify with redis instance
  fastify.decorate('redis', redis);

  // Close Redis connection on server shutdown
  fastify.addHook('onClose', async () => {
    await redis.quit();
  });
}, { name: 'redis', dependencies: [] });

declare module 'fastify' {
  interface FastifyInstance {
    redis: RedisClientType;
  }
}