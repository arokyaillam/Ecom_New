// Coupon Service - Coupon CRUD with validation
import { db } from '../db/index.js';
import { coupons } from '../db/schema.js';
import { eq, and, desc, count } from 'drizzle-orm';
import { ErrorCodes } from '../errors/codes.js';

export const couponService = {
  async findByStoreId(storeId: string, opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const where = eq(coupons.storeId, storeId);

    const [rows, totalResult] = await Promise.all([
      db.query.coupons.findMany({
        where,
        orderBy: desc(coupons.createdAt),
        limit,
        offset,
      }),
      db.select({ count: count() })
        .from(coupons)
        .where(where),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(couponId: string, storeId: string) {
    const coupon = await db.query.coupons.findFirst({
      where: and(eq(coupons.id, couponId), eq(coupons.storeId, storeId)),
    });

    if (!coupon) {
      throw Object.assign(new Error('Coupon not found'), {
        code: ErrorCodes.INVALID_COUPON,
      });
    }

    return coupon;
  },

  async findByCode(code: string, storeId: string) {
    const coupon = await db.query.coupons.findFirst({
      where: and(
        eq(coupons.code, code),
        eq(coupons.storeId, storeId),
      ),
    });

    return coupon;
  },

  async create(data: {
    storeId: string;
    code: string;
    description?: string;
    type: string;
    value: string;
    minOrderAmount?: string;
    maxDiscountAmount?: string;
    freeShipping?: boolean;
    usageLimit?: number;
    usageLimitPerCustomer?: number;
    startsAt?: Date;
    expiresAt?: Date;
    appliesTo?: string;
    productIds?: string;
    categoryIds?: string;
  }) {
    // Check for duplicate code within the store
    const existing = await this.findByCode(data.code, data.storeId);
    if (existing) {
      throw Object.assign(new Error('Coupon code already exists in this store'), {
        code: ErrorCodes.INVALID_COUPON,
      });
    }

    const [coupon] = await db.insert(coupons).values({
      storeId: data.storeId,
      code: data.code.toUpperCase(),
      description: data.description,
      type: data.type,
      value: data.value,
      minOrderAmount: data.minOrderAmount,
      maxDiscountAmount: data.maxDiscountAmount,
      freeShipping: data.freeShipping ?? false,
      usageLimit: data.usageLimit,
      usageLimitPerCustomer: data.usageLimitPerCustomer ?? 1,
      startsAt: data.startsAt,
      expiresAt: data.expiresAt,
      appliesTo: data.appliesTo ?? 'all',
      productIds: data.productIds,
      categoryIds: data.categoryIds,
    }).returning();

    return coupon;
  },

  async update(couponId: string, storeId: string, data: Partial<{
    code: string;
    description: string;
    type: string;
    value: string;
    minOrderAmount: string;
    maxDiscountAmount: string;
    freeShipping: boolean;
    usageLimit: number;
    usageLimitPerCustomer: number;
    isActive: boolean;
    startsAt: Date;
    expiresAt: Date;
    appliesTo: string;
    productIds: string;
    categoryIds: string;
  }>) {
    const coupon = await db.query.coupons.findFirst({
      where: and(eq(coupons.id, couponId), eq(coupons.storeId, storeId)),
    });

    if (!coupon) {
      throw Object.assign(new Error('Coupon not found'), {
        code: ErrorCodes.INVALID_COUPON,
      });
    }

    // If updating the code, check for duplicates
    if (data.code && data.code.toUpperCase() !== coupon.code) {
      const existing = await this.findByCode(data.code, storeId);
      if (existing) {
        throw Object.assign(new Error('Coupon code already exists in this store'), {
          code: ErrorCodes.INVALID_COUPON,
        });
      }
    }

    const updateData = {
      ...data,
      ...(data.code ? { code: data.code.toUpperCase() } : {}),
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(coupons)
      .set(updateData)
      .where(and(eq(coupons.id, couponId), eq(coupons.storeId, storeId)))
      .returning();

    return updated;
  },

  async delete(couponId: string, storeId: string) {
    const coupon = await db.query.coupons.findFirst({
      where: and(eq(coupons.id, couponId), eq(coupons.storeId, storeId)),
    });

    if (!coupon) {
      throw Object.assign(new Error('Coupon not found'), {
        code: ErrorCodes.INVALID_COUPON,
      });
    }

    await db
      .delete(coupons)
      .where(and(eq(coupons.id, couponId), eq(coupons.storeId, storeId)));

    return { id: couponId, deleted: true };
  },

  async validateCoupon(code: string, storeId: string, orderAmount?: string) {
    const coupon = await this.findByCode(code, storeId);

    if (!coupon) {
      throw Object.assign(new Error('Invalid coupon code'), {
        code: ErrorCodes.INVALID_COUPON,
      });
    }

    if (!coupon.isActive) {
      throw Object.assign(new Error('Coupon is not active'), {
        code: ErrorCodes.INVALID_COUPON,
      });
    }

    const now = new Date();

    if (coupon.startsAt && new Date(coupon.startsAt) > now) {
      throw Object.assign(new Error('Coupon is not yet active'), {
        code: ErrorCodes.COUPON_EXPIRED,
      });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
      throw Object.assign(new Error('Coupon has expired'), {
        code: ErrorCodes.COUPON_EXPIRED,
      });
    }

    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && (coupon.usageCount ?? 0) >= coupon.usageLimit) {
      throw Object.assign(new Error('Coupon usage limit has been reached'), {
        code: ErrorCodes.COUPON_USAGE_EXCEEDED,
      });
    }

    if (coupon.minOrderAmount && orderAmount) {
      const minAmount = parseFloat(coupon.minOrderAmount);
      const amount = parseFloat(orderAmount);
      if (amount < minAmount) {
        throw Object.assign(new Error(`Minimum order amount of ${coupon.minOrderAmount} required`), {
          code: ErrorCodes.INVALID_COUPON,
        });
      }
    }

    return coupon;
  },
};