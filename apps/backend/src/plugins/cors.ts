import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';

export default fp(async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow non-browser requests (Postman, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Allow localhost in development (exact hostname matching)
      if (process.env.NODE_ENV === 'development') {
        try {
          const url = new URL(origin);
          if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            callback(null, true);
            return;
          }
        } catch {
          callback(null, false);
          return;
        }
      }

      // In production, reject unmatched origins
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });
}, { name: 'cors', dependencies: [] });