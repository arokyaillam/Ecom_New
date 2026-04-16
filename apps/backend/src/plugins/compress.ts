import fp from 'fastify-plugin';
import compress from '@fastify/compress';
import { FastifyInstance } from 'fastify';

export default fp(async function compressPlugin(fastify: FastifyInstance) {
  await fastify.register(compress, {
    encodings: ['gzip', 'deflate'],
  });
}, { name: 'compress', dependencies: [] });