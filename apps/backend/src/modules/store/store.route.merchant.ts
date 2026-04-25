// Merchant Store Routes - GET/PATCH store info
import { FastifyInstance } from 'fastify';
import { requirePermission } from '../../scopes/merchant.js';
import { storeService } from './store.service.js';
import { merchantUpdateStoreSchema as updateStoreSchema, updateDomainSchema, updateIntegrationsSchema } from './store.schema.js';

export default async function merchantStoreRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/store
  fastify.get('/', {
    schema: {
      tags: ['Merchant Store'],
      summary: 'Get store details',
      description: 'Retrieve the authenticated merchant store information, excluding sensitive owner fields',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const store = await storeService.findByIdOrFail(request.storeId);
    // Strip sensitive owner fields from response
    const { ownerEmail: _ownerEmail, ownerName: _ownerName, ownerPhone: _ownerPhone, ...publicStore } = store;
    return { store: publicStore };
  });

  // PATCH /api/v1/merchant/store
  fastify.patch('/', {
    preHandler: requirePermission('store:write'),
    schema: {
      tags: ['Merchant Store'],
      summary: 'Update store details',
      description: 'Partial update of the authenticated merchant store settings including branding and theme',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const parsed = updateStoreSchema.parse(request.body);
    const store = await storeService.update(request.storeId, parsed);

    const { ownerEmail: _ownerEmail, ownerName: _ownerName, ownerPhone: _ownerPhone, ...publicStore } = store;
    return { store: publicStore };
  });

  // GET /api/v1/merchant/store/domain
  fastify.get('/domain', {
    schema: {
      tags: ['Merchant Store'],
      summary: 'Get domain configuration',
      description: 'Retrieve subdomain and custom domain settings for the store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const config = await storeService.getDomainConfig(request.storeId);
    return config;
  });

  // PATCH /api/v1/merchant/store/domain
  fastify.patch('/domain', {
    preHandler: requirePermission('store:write'),
    schema: {
      tags: ['Merchant Store'],
      summary: 'Update custom domain',
      description: 'Set or change the custom domain for the store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const parsed = updateDomainSchema.parse(request.body);
    const store = await storeService.updateCustomDomain(request.storeId, parsed.customDomain);
    return {
      subdomain: store.domain,
      customDomain: store.customDomain,
      customDomainVerified: store.customDomainVerified,
      customDomainVerifiedAt: store.customDomainVerifiedAt,
    };
  });

  // POST /api/v1/merchant/store/domain/verify
  fastify.post('/domain/verify', {
    preHandler: requirePermission('store:write'),
    schema: {
      tags: ['Merchant Store'],
      summary: 'Verify custom domain',
      description: 'Trigger verification of the custom domain DNS configuration',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const store = await storeService.verifyCustomDomain(request.storeId);
    return {
      subdomain: store.domain,
      customDomain: store.customDomain,
      customDomainVerified: store.customDomainVerified,
      customDomainVerifiedAt: store.customDomainVerifiedAt,
    };
  });

  // GET /api/v1/merchant/store/integrations
  fastify.get('/integrations', {
    schema: {
      tags: ['Merchant Store'],
      summary: 'List integrations',
      description: 'Get current third-party integration configurations',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const integrations = await storeService.getIntegrations(request.storeId);
    return { integrations };
  });

  // PATCH /api/v1/merchant/store/integrations
  fastify.patch('/integrations', {
    preHandler: requirePermission('store:write'),
    schema: {
      tags: ['Merchant Store'],
      summary: 'Update integration',
      description: 'Enable/disable or configure a third-party integration',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const parsed = updateIntegrationsSchema.parse(request.body);
    const integrations = await storeService.updateIntegration(request.storeId, parsed);
    return { integrations };
  });
}
