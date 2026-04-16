// Product Service - CRUD for products with categories, variants, modifier groups
import { db } from '../db/index.js';
import {
  products,
  productVariants,
  productVariantOptions,
} from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { ErrorCodes } from '../errors/codes.js';

export const productService = {
  async findByStoreId(
    storeId: string,
    options?: { limit?: number; offset?: number; isPublished?: boolean },
  ) {
    const conditions = [eq(products.storeId, storeId)];

    if (options?.isPublished !== undefined) {
      conditions.push(eq(products.isPublished, options.isPublished));
    }

    const items = await db.query.products.findMany({
      where: and(...conditions),
      with: {
        category: true,
        subcategory: true,
        variants: {
          with: {
            options: true,
          },
        },
        modifierGroups: {
          with: {
            options: true,
          },
        },
      },
      orderBy: [desc(products.createdAt)],
      limit: options?.limit,
      offset: options?.offset,
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(...conditions));

    return { items, total: count };
  },

  async findById(id: string, storeId: string) {
    const product = await db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.storeId, storeId)),
      with: {
        category: true,
        subcategory: true,
        variants: {
          with: {
            options: true,
          },
        },
        modifierGroups: {
          with: {
            options: true,
          },
        },
      },
    });

    if (!product) {
      throw Object.assign(new Error('Product not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return product;
  },

  async create(data: typeof products.$inferInsert) {
    const [product] = await db.insert(products).values(data).returning();

    if (!product) {
      throw Object.assign(new Error('Failed to create product'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return product;
  },

  async update(id: string, storeId: string, data: Partial<typeof products.$inferInsert>) {
    const [product] = await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.storeId, storeId)))
      .returning();

    if (!product) {
      throw Object.assign(new Error('Product not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return product;
  },

  async delete(id: string, storeId: string) {
    const [product] = await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.storeId, storeId)))
      .returning();

    if (!product) {
      throw Object.assign(new Error('Product not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return product;
  },

  // --- Variant operations ---

  async createVariant(data: typeof productVariants.$inferInsert) {
    const [variant] = await db.insert(productVariants).values(data).returning();

    if (!variant) {
      throw Object.assign(new Error('Failed to create product variant'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return variant;
  },

  async updateVariant(id: string, storeId: string, data: Partial<typeof productVariants.$inferInsert>) {
    const [variant] = await db
      .update(productVariants)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(productVariants.id, id), eq(productVariants.storeId, storeId)))
      .returning();

    if (!variant) {
      throw Object.assign(new Error('Product variant not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return variant;
  },

  async deleteVariant(id: string, storeId: string) {
    const [variant] = await db
      .delete(productVariants)
      .where(and(eq(productVariants.id, id), eq(productVariants.storeId, storeId)))
      .returning();

    if (!variant) {
      throw Object.assign(new Error('Product variant not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return variant;
  },

  // --- Variant option operations ---

  async createVariantOption(data: typeof productVariantOptions.$inferInsert) {
    const [option] = await db.insert(productVariantOptions).values(data).returning();

    if (!option) {
      throw Object.assign(new Error('Failed to create variant option'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return option;
  },

  async updateVariantOption(
    id: string,
    storeId: string,
    data: Partial<typeof productVariantOptions.$inferInsert>,
  ) {
    const [option] = await db
      .update(productVariantOptions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(productVariantOptions.id, id), eq(productVariantOptions.storeId, storeId)))
      .returning();

    if (!option) {
      throw Object.assign(new Error('Variant option not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return option;
  },

  async deleteVariantOption(id: string, storeId: string) {
    const [option] = await db
      .delete(productVariantOptions)
      .where(and(eq(productVariantOptions.id, id), eq(productVariantOptions.storeId, storeId)))
      .returning();

    if (!option) {
      throw Object.assign(new Error('Variant option not found'), {
        code: ErrorCodes.PRODUCT_NOT_FOUND,
      });
    }

    return option;
  },
};