// Merchant Store Routes - GET/PATCH store info
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { storeService } from '../../services/store.service.js';

// Strict validation patterns to prevent CSS/JS injection via theme fields
const hexColor = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color (e.g. #0ea5e9 or #fff)');
const cssRadius = z.string().regex(/^\d{1,4}px$/, 'Must be a valid CSS radius (e.g. 12px)');
const cssFontStack = z.string().regex(/^[a-zA-Z0-9,\s"'-]{1,200}$/, 'Must be a valid CSS font-family value');
const cssRgbaColor = z.string().regex(/^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[01]?\.\d+\s*\)$|^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex or rgba color');

const updateStoreSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  domain: z.string().min(1).max(255).optional(),
  primaryColor: hexColor.optional(),
  secondaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
  backgroundColor: hexColor.optional(),
  surfaceColor: hexColor.optional(),
  textColor: hexColor.optional(),
  textSecondaryColor: hexColor.optional(),
  borderColor: cssRgbaColor.optional(),
  borderRadius: cssRadius.optional(),
  fontFamily: cssFontStack.optional(),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  activeTheme: z.string().max(50).optional(),
  currency: z.string().max(3).optional(),
  language: z.string().max(5).optional(),
  heroImage: z.string().url().optional(),
  heroTitle: z.string().max(255).optional(),
  heroSubtitle: z.string().max(500).optional(),
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