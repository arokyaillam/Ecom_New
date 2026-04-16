// Merchant Store Routes - GET/PATCH store info
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { storeService } from '../../services/store.service.js';

const updateStoreSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  domain: z.string().min(1).max(255).optional(),
  primaryColor: z.string().max(7).optional(),
  secondaryColor: z.string().max(7).optional(),
  accentColor: z.string().max(7).optional(),
  backgroundColor: z.string().max(20).optional(),
  surfaceColor: z.string().max(20).optional(),
  textColor: z.string().max(20).optional(),
  textSecondaryColor: z.string().max(20).optional(),
  borderColor: z.string().max(30).optional(),
  borderRadius: z.string().max(10).optional(),
  fontFamily: z.string().max(100).optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  activeTheme: z.string().max(50).optional(),
  currency: z.string().max(3).optional(),
  language: z.string().max(5).optional(),
  heroImage: z.string().optional(),
  heroTitle: z.string().max(255).optional(),
  heroSubtitle: z.string().optional(),
  heroCtaText: z.string().max(100).optional(),
  heroCtaLink: z.string().max(500).optional(),
  heroEnabled: z.boolean().optional(),
});

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
    const { ownerEmail, ownerName, ownerPhone, ...publicStore } = store;
    return { store: publicStore };
  });

  // PATCH /api/v1/merchant/store
  fastify.patch('/', {
    schema: {
      tags: ['Merchant Store'],
      summary: 'Update store details',
      description: 'Partial update of the authenticated merchant store settings including branding and theme',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const parsed = updateStoreSchema.parse(request.body);
    const store = await storeService.update(request.storeId, parsed);

    const { ownerEmail, ownerName, ownerPhone, ...publicStore } = store;
    return { store: publicStore };
  });
}