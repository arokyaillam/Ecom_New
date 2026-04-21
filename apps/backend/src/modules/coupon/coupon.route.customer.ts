// Customer Coupon Routes - Validate coupons for storefront checkout
import { FastifyInstance } from 'fastify';
import { couponService } from './coupon.service.js';
import { validateSchema } from './coupon.schema.js';

export default async function customerCouponRoutes(fastify: FastifyInstance) {
  // POST /api/v1/customer/coupons/validate - Validate a coupon code for checkout
  fastify.post('/validate', {
    config: {
      rateLimit: { max: 10, timeWindow: '1 minute' },
    },
    schema: {
      tags: ['Customer Coupons'],
      summary: 'Validate coupon code',
      description: 'Validate a coupon code for the current store. Used at checkout by authenticated customers.',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const parsed = validateSchema.parse(request.body);
    const coupon = await couponService.validateCoupon(parsed.code, request.storeId, parsed.orderAmount);
    return { valid: true, coupon };
  });
}