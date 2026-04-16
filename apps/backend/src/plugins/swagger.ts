// Swagger Plugin - OpenAPI documentation with Zod schema support
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

export default fp(async function swaggerPlugin(fastify: FastifyInstance) {
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'SaaS E-commerce API',
        description:
          'Multi-tenant headless ecommerce SaaS platform. ' +
          'All merchant/customer/admin endpoints require JWT cookie authentication. ' +
          'Public endpoints resolve store via Host header subdomain.',
        version: '1.0.0',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Development' },
      ],
      tags: [
        { name: 'Public', description: 'Storefront browsing (no auth required)' },
        { name: 'Merchant Auth', description: 'Merchant login, register, logout' },
        { name: 'Merchant Store', description: 'Store settings management' },
        { name: 'Merchant Products', description: 'Product, variant, and option management' },
        { name: 'Merchant Categories', description: 'Category and subcategory management' },
        { name: 'Merchant Modifiers', description: 'Modifier groups and options' },
        { name: 'Merchant Orders', description: 'Order management and fulfillment' },
        { name: 'Merchant Customers', description: 'Customer list and details' },
        { name: 'Merchant Reviews', description: 'Review moderation' },
        { name: 'Merchant Coupons', description: 'Coupon management' },
        { name: 'Merchant Analytics', description: 'Dashboard and revenue analytics' },
        { name: 'Merchant Upload', description: 'File upload' },
        { name: 'Customer Auth', description: 'Customer login, register, logout' },
        { name: 'Customer Profile', description: 'Profile management' },
        { name: 'Customer Orders', description: 'Order history and details' },
        { name: 'Customer Checkout', description: 'Place orders' },
        { name: 'Customer Wishlist', description: 'Wishlist management' },
        { name: 'Customer Reviews', description: 'Customer reviews' },
        { name: 'SuperAdmin Auth', description: 'Admin login, logout' },
        { name: 'SuperAdmin Merchants', description: 'Store approval and management' },
        { name: 'SuperAdmin Plans', description: 'Plan CRUD' },
        { name: 'SuperAdmin Stores', description: 'Store management and platform stats' },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'token',
            description: 'JWT token set via httpOnly cookie on login',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      persistAuthorization: true,
      displayRequestDuration: true,
    },
    staticCSP: true,
  });
}, { name: 'swagger', dependencies: [] });