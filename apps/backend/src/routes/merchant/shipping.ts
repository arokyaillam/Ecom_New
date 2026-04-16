// Merchant Shipping Routes - Zone and rate CRUD
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { shippingService } from '../../services/shipping.service.js';

const idParamSchema = z.strictObject({ id: z.string().uuid() });
const zoneIdParamSchema = z.strictObject({ zoneId: z.string().uuid() });

const createZoneSchema = z.strictObject({
  name: z.string().min(1).max(255),
  countries: z.array(z.string()).optional(),
  states: z.array(z.string()).optional(),
  postalCodePatterns: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const updateZoneSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  countries: z.array(z.string()).optional(),
  states: z.array(z.string()).optional(),
  postalCodePatterns: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const createRateSchema = z.strictObject({
  name: z.string().min(1).max(255),
  method: z.enum(['standard', 'express', 'overnight', 'pickup']),
  carrier: z.string().max(100).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  freeAbove: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  weightBased: z.boolean().optional(),
  pricePerKg: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  estimatedDays: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updateRateSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  method: z.enum(['standard', 'express', 'overnight', 'pickup']).optional(),
  carrier: z.string().max(100).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  freeAbove: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  weightBased: z.boolean().optional(),
  pricePerKg: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  estimatedDays: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export default async function merchantShippingRoutes(fastify: FastifyInstance) {
  // ─── Zones ───

  // GET /api/v1/merchant/shipping/zones
  fastify.get('/zones', {
    schema: { tags: ['Merchant Shipping'], summary: 'List shipping zones', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const zones = await shippingService.listZones(request.storeId);
    return { zones };
  });

  // POST /api/v1/merchant/shipping/zones
  fastify.post('/zones', {
    schema: { tags: ['Merchant Shipping'], summary: 'Create shipping zone', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const parsed = createZoneSchema.parse(request.body);
    const zone = await shippingService.createZone(request.storeId, parsed);
    reply.status(201).send({ zone });
  });

  // GET /api/v1/merchant/shipping/zones/:id
  fastify.get('/zones/:id', {
    schema: { tags: ['Merchant Shipping'], summary: 'Get shipping zone', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const zone = await shippingService.getZone(id, request.storeId);
    if (!zone) return { zone: null };
    return { zone };
  });

  // PATCH /api/v1/merchant/shipping/zones/:id
  fastify.patch('/zones/:id', {
    schema: { tags: ['Merchant Shipping'], summary: 'Update shipping zone', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateZoneSchema.parse(request.body);
    const zone = await shippingService.updateZone(id, request.storeId, parsed);
    return { zone };
  });

  // DELETE /api/v1/merchant/shipping/zones/:id
  fastify.delete('/zones/:id', {
    schema: { tags: ['Merchant Shipping'], summary: 'Delete shipping zone', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await shippingService.deleteZone(id, request.storeId);
    reply.status(204).send();
  });

  // ─── Rates ───

  // GET /api/v1/merchant/shipping/zones/:zoneId/rates
  fastify.get('/zones/:zoneId/rates', {
    schema: { tags: ['Merchant Shipping'], summary: 'List shipping rates for zone', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const { zoneId } = zoneIdParamSchema.parse(request.params);
    const rates = await shippingService.listRates(zoneId, request.storeId);
    return { rates };
  });

  // POST /api/v1/merchant/shipping/zones/:zoneId/rates
  fastify.post('/zones/:zoneId/rates', {
    schema: { tags: ['Merchant Shipping'], summary: 'Create shipping rate', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const { zoneId } = zoneIdParamSchema.parse(request.params);
    const parsed = createRateSchema.parse(request.body);
    const rate = await shippingService.createRate(request.storeId, { ...parsed, zoneId });
    reply.status(201).send({ rate });
  });

  // PATCH /api/v1/merchant/shipping/rates/:id
  fastify.patch('/rates/:id', {
    schema: { tags: ['Merchant Shipping'], summary: 'Update shipping rate', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateRateSchema.parse(request.body);
    const rate = await shippingService.updateRate(id, request.storeId, parsed);
    return { rate };
  });

  // DELETE /api/v1/merchant/shipping/rates/:id
  fastify.delete('/rates/:id', {
    schema: { tags: ['Merchant Shipping'], summary: 'Delete shipping rate', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await shippingService.deleteRate(id, request.storeId);
    reply.status(204).send();
  });
}