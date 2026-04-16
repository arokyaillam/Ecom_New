// Review Service - Review CRUD for products
import { db } from '../db/index.js';
import { reviews } from '../db/schema.js';
import { eq, and, desc, count } from 'drizzle-orm';
import { ErrorCodes } from '../errors/codes.js';

// Safe customer columns - excludes password and reset tokens
const safeCustomerColumns = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  storeId: true,
} as const;

export const reviewService = {
  async findByProductId(productId: string, storeId: string, opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const where = and(
      eq(reviews.productId, productId),
      eq(reviews.storeId, storeId),
    );

    const [rows, totalResult] = await Promise.all([
      db.query.reviews.findMany({
        where,
        orderBy: desc(reviews.createdAt),
        limit,
        offset,
        with: {
          customer: {
            columns: safeCustomerColumns,
          },
        },
      }),
      db.select({ count: count() })
        .from(reviews)
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

  async findByStoreId(storeId: string, opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const where = eq(reviews.storeId, storeId);

    const [rows, totalResult] = await Promise.all([
      db.query.reviews.findMany({
        where,
        orderBy: desc(reviews.createdAt),
        limit,
        offset,
        with: {
          customer: {
            columns: safeCustomerColumns,
          },
          product: true,
        },
      }),
      db.select({ count: count() })
        .from(reviews)
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

  async findById(reviewId: string, storeId: string) {
    const review = await db.query.reviews.findFirst({
      where: and(eq(reviews.id, reviewId), eq(reviews.storeId, storeId)),
      with: {
        customer: {
          columns: safeCustomerColumns,
        },
        product: true,
      },
    });

    if (!review) {
      throw Object.assign(new Error('Review not found'), {
        code: ErrorCodes.REVIEW_NOT_FOUND,
      });
    }

    return review;
  },

  async create(data: {
    storeId: string;
    productId: string;
    customerId?: string;
    orderId?: string;
    rating: number;
    title?: string;
    content: string;
    images?: string;
    isVerified?: boolean;
  }) {
    const [review] = await db.insert(reviews).values({
      storeId: data.storeId,
      productId: data.productId,
      customerId: data.customerId,
      orderId: data.orderId,
      rating: data.rating,
      title: data.title,
      content: data.content,
      images: data.images,
      isVerified: data.isVerified ?? false,
    }).returning();

    return review;
  },

  async update(reviewId: string, storeId: string, data: Partial<{
    rating: number;
    title: string;
    content: string;
    images: string;
    isApproved: boolean;
    response: string;
  }>) {
    const review = await db.query.reviews.findFirst({
      where: and(eq(reviews.id, reviewId), eq(reviews.storeId, storeId)),
    });

    if (!review) {
      throw Object.assign(new Error('Review not found'), {
        code: ErrorCodes.REVIEW_NOT_FOUND,
      });
    }

    const updateData: Partial<typeof reviews.$inferInsert> = {
      ...data,
      updatedAt: new Date(),
    };

    // If responding to a review, set respondedAt timestamp
    if (data.response) {
      updateData.respondedAt = new Date();
    }

    const [updated] = await db
      .update(reviews)
      .set(updateData)
      .where(and(eq(reviews.id, reviewId), eq(reviews.storeId, storeId)))
      .returning();

    return updated;
  },

  async delete(reviewId: string, storeId: string) {
    const review = await db.query.reviews.findFirst({
      where: and(eq(reviews.id, reviewId), eq(reviews.storeId, storeId)),
    });

    if (!review) {
      throw Object.assign(new Error('Review not found'), {
        code: ErrorCodes.REVIEW_NOT_FOUND,
      });
    }

    await db
      .delete(reviews)
      .where(and(eq(reviews.id, reviewId), eq(reviews.storeId, storeId)));

    return { id: reviewId, deleted: true };
  },
};