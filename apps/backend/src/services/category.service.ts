// Category Service - CRUD for categories with subcategories
import { db } from '../db/index.js';
import { categories, subcategories } from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { ErrorCodes } from '../errors/codes.js';

export const categoryService = {
  async findByStoreId(
    storeId: string,
    options?: { limit?: number; offset?: number },
  ) {
    const items = await db.query.categories.findMany({
      where: eq(categories.storeId, storeId),
      with: {
        subcategories: true,
      },
      orderBy: [desc(categories.createdAt)],
      limit: options?.limit,
      offset: options?.offset,
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(categories)
      .where(eq(categories.storeId, storeId));

    return { items, total: count };
  },

  async findById(id: string, storeId: string) {
    const category = await db.query.categories.findFirst({
      where: and(eq(categories.id, id), eq(categories.storeId, storeId)),
      with: {
        subcategories: true,
      },
    });

    if (!category) {
      throw Object.assign(new Error('Category not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return category;
  },

  async create(data: typeof categories.$inferInsert) {
    const [category] = await db.insert(categories).values(data).returning();

    if (!category) {
      throw Object.assign(new Error('Failed to create category'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return category;
  },

  async update(id: string, storeId: string, data: Partial<typeof categories.$inferInsert>) {
    const [category] = await db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.storeId, storeId)))
      .returning();

    if (!category) {
      throw Object.assign(new Error('Category not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return category;
  },

  async delete(id: string, storeId: string) {
    const [category] = await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.storeId, storeId)))
      .returning();

    if (!category) {
      throw Object.assign(new Error('Category not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return category;
  },

  // --- Subcategory operations ---

  async createSubcategory(data: typeof subcategories.$inferInsert) {
    const [subcategory] = await db.insert(subcategories).values(data).returning();

    if (!subcategory) {
      throw Object.assign(new Error('Failed to create subcategory'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return subcategory;
  },

  async updateSubcategory(
    id: string,
    storeId: string,
    data: Partial<typeof subcategories.$inferInsert>,
  ) {
    const [subcategory] = await db
      .update(subcategories)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(subcategories.id, id), eq(subcategories.storeId, storeId)))
      .returning();

    if (!subcategory) {
      throw Object.assign(new Error('Subcategory not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return subcategory;
  },

  async deleteSubcategory(id: string, storeId: string) {
    const [subcategory] = await db
      .delete(subcategories)
      .where(and(eq(subcategories.id, id), eq(subcategories.storeId, storeId)))
      .returning();

    if (!subcategory) {
      throw Object.assign(new Error('Subcategory not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return subcategory;
  },
};