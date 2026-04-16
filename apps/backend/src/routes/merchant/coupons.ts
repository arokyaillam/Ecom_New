// Merchant Coupons Routes - CRUD for coupons
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { couponService } from '../../services/coupon.service.js';

const listQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});

const createCouponSchema = z.strictObject({
  code: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  type: z.enum(['percentage', 'fixed', 'free_shipping']),
  value: z.string().regex(/^\d+(\.\d{1,2})?$/),
  minOrderAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  maxDiscountAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  freeShipping: z.boolean().default(false),
  usageLimit: z.number().int().min(1).optional(),
  usageLimitPerCustomer: z.number().int().min(1).default(1),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  appliesTo: z.enum(['all', 'products', 'categories']).default('all'),
  productIds: z.string().optional(),
  categoryIds: z.string().optional(),
});

const updateCouponSchema = z.strictObject({
  code: z.string().min(1).max(50).optional(),
  description: z.string().max(500).nullable().optional(),
  type: z.enum(['percentage', 'fixed', 'free_shipping']).optional(),
  value: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  minOrderAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  maxDiscountAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  freeShipping: z.boolean().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  usageLimitPerCustomer: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  appliesTo: z.enum(['all', 'products', 'categories']).optional(),
  productIds: z.string().nullable().optional(),
  categoryIds: z.string().nullable().optional(),
});

const validateSchema = z.strictObject({
  code: z.string().min(1).max(50),
  orderAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
});

export default async function merchantCouponsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/coupons
  fastify.get('/', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await couponService.findByStoreId(request.storeId, query);
    return result;
  });

  // POST /api/v1/merchant/coupons
  fastify.post('/', async (request, reply) => {
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
  fastify.get('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const coupon = await couponService.findById(id, request.storeId);
    return { coupon };
  });

  // PATCH /api/v1/merchant/coupons/:id
  fastify.patch('/:id', async (request) => {
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
  fastify.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await couponService.delete(id, request.storeId);
    reply.status(204).send();
  });

  // POST /api/v1/merchant/coupons/validate - validate a coupon code
  fastify.post('/validate', async (request) => {
    const parsed = validateSchema.parse(request.body);
    const coupon = await couponService.validateCoupon(parsed.code, request.storeId, parsed.orderAmount);
    return { valid: true, coupon };
  });
}