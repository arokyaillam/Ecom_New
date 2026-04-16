import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export default fp(async function jwtPlugin(fastify: FastifyInstance) {
  // Register cookie plugin first (required for httpOnly JWT cookies)
  await fastify.register(cookie);

  // Register JWT plugin
  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });
}, { name: 'jwt', dependencies: [] });