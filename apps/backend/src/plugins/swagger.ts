import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';

export default fp(async function swaggerPlugin(fastify: FastifyInstance) {
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'SaaS E-commerce API',
        description: 'Multi-tenant headless ecommerce SaaS platform API',
        version: '1.0.0',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Development' },
      ],
      tags: [
        { name: 'Public', description: 'Public storefront endpoints' },
        { name: 'Merchant', description: 'Merchant management endpoints' },
        { name: 'Customer', description: 'Customer endpoints' },
        { name: 'SuperAdmin', description: 'Super admin endpoints' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });
}, { name: 'swagger', dependencies: [] });