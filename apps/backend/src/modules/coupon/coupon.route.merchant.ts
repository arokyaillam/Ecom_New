// Merchant Coupons Routes - CRUD for coupons
import { FastifyInstance } from 'fastify';
import { couponService } from './coupon.service.js';
import { idParamSchema } from '../_shared/schema.js';
import { listQuerySchema, createCouponSchema, updateCouponSchema, validateSchema } from './coupon.schema.js';

export default async function merchantCouponsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/coupons
  fastify.get('/', {
    schema: {
      tags: ['Merchant Coupons'],
      summary: 'List coupons',
      description: 'List all coupons for the authenticated merchant store with pagination',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await couponService.findByStoreId(request.storeId, query);
    return result;
  });

  // POST /api/v1/merchant/coupons
  fastify.post('/', {
    schema: {
      tags: ['Merchant Coupons'],
      summary: 'Create coupon',
      description: 'Create a new coupon in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = createCouponSchema.parse(request.body);
    const coupon = await couponService.create({
      ...parsed,
      storeId: request.storeId,
      startsAt: parsed.startsAt ? new Date(parsed.startsAt) : undefined,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
    });
    reply.status(201).send({ coupon });
  });

  // GET /api/v1/merchant/coupons/:id
  fastify.get('/:id', {
    schema: {
      tags: ['Merchant Coupons'],
      summary: 'Get coupon detail',
      description: 'Retrieve a single coupon by ID for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const coupon = await couponService.findById(id, request.storeId);
    return { coupon };
  });

  // PATCH /api/v1/merchant/coupons/:id
  fastify.patch('/:id', {
    schema: {
      tags: ['Merchant Coupons'],
      summary: 'Update coupon',
      description: 'Partial update of a coupon in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateCouponSchema.parse(request.body);
    // Convert date strings to Date objects for the service layer
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value === undefined) continue;
      if ((key === 'startsAt' || key === 'expiresAt') && typeof value === 'string') {
        updateData[key] = new Date(value as string);
      } else {
        updateData[key] = value;
      }
    }
    const coupon = await couponService.update(id, request.storeId, updateData as Parameters<typeof couponService.update>[2]);
    return { coupon };
  });

  // DELETE /api/v1/merchant/coupons/:id
  fastify.delete('/:id', {
    schema: {
      tags: ['Merchant Coupons'],
      summary: 'Delete coupon',
      description: 'Delete a coupon from the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await couponService.delete(id, request.storeId);
    reply.status(204).send();
  });

  // POST /api/v1/merchant/coupons/validate - validate a coupon code
  fastify.post('/validate', {
    config: {
      rateLimit: { max: 10, timeWindow: '1 minute' },
    },
    schema: {
      tags: ['Merchant Coupons'],
      summary: 'Validate coupon code',
      description: 'Validate a coupon code against order amount and store rules',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const parsed = validateSchema.parse(request.body);
    const coupon = await couponService.validateCoupon(parsed.code, request.storeId, parsed.orderAmount);
    return { valid: true, coupon };
  });
}