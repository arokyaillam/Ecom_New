import fp from 'fastify-plugin';
import sensible from '@fastify/sensible';
import { FastifyInstance } from 'fastify';

export default fp(async function sensiblePlugin(fastify: FastifyInstance) {
  await fastify.register(sensible);
}, { name: 'sensible', dependencies: [] });