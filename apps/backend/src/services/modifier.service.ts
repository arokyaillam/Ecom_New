// Modifier Service - CRUD for modifier groups with options
import { db } from '../db/index.js';
import { modifierGroups, modifierOptions } from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { ErrorCodes } from '../errors/codes.js';

export const modifierService = {
  // --- Modifier Group operations ---

  async findByStoreId(
    storeId: string,
    options?: { limit?: number; offset?: number },
  ) {
    const items = await db.query.modifierGroups.findMany({
      where: eq(modifierGroups.storeId, storeId),
      with: {
        product: true,
        category: true,
        options: true,
      },
      orderBy: [desc(modifierGroups.createdAt)],
      limit: options?.limit,
      offset: options?.offset,
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(modifierGroups)
      .where(eq(modifierGroups.storeId, storeId));

    return { items, total: count };
  },

  async findById(id: string, storeId: string) {
    const group = await db.query.modifierGroups.findFirst({
      where: and(eq(modifierGroups.id, id), eq(modifierGroups.storeId, storeId)),
      with: {
        product: true,
        category: true,
        options: true,
      },
    });

    if (!group) {
      throw Object.assign(new Error('Modifier group not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return group;
  },

  async findByProductId(productId: string, storeId: string) {
    const groups = await db.query.modifierGroups.findMany({
      where: and(
        eq(modifierGroups.productId, productId),
        eq(modifierGroups.storeId, storeId),
      ),
      with: {
        options: true,
      },
      orderBy: [desc(modifierGroups.sortOrder)],
    });

    return groups;
  },

  async create(data: typeof modifierGroups.$inferInsert) {
    const [group] = await db.insert(modifierGroups).values(data).returning();

    if (!group) {
      throw Object.assign(new Error('Failed to create modifier group'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return group;
  },

  async update(id: string, storeId: string, data: Partial<typeof modifierGroups.$inferInsert>) {
    const [group] = await db
      .update(modifierGroups)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(modifierGroups.id, id), eq(modifierGroups.storeId, storeId)))
      .returning();

    if (!group) {
      throw Object.assign(new Error('Modifier group not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return group;
  },

  async delete(id: string, storeId: string) {
    const [group] = await db
      .delete(modifierGroups)
      .where(and(eq(modifierGroups.id, id), eq(modifierGroups.storeId, storeId)))
      .returning();

    if (!group) {
      throw Object.assign(new Error('Modifier group not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return group;
  },

  // --- Modifier Option operations ---

  async findOptionById(id: string, storeId: string) {
    const option = await db.query.modifierOptions.findFirst({
      where: and(eq(modifierOptions.id, id), eq(modifierOptions.storeId, storeId)),
    });

    if (!option) {
      throw Object.assign(new Error('Modifier option not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return option;
  },

  async createOption(data: typeof modifierOptions.$inferInsert) {
    const [option] = await db.insert(modifierOptions).values(data).returning();

    if (!option) {
      throw Object.assign(new Error('Failed to create modifier option'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return option;
  },

  async updateOption(
    id: string,
    storeId: string,
    data: Partial<typeof modifierOptions.$inferInsert>,
  ) {
    const [option] = await db
      .update(modifierOptions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(modifierOptions.id, id), eq(modifierOptions.storeId, storeId)))
      .returning();

    if (!option) {
      throw Object.assign(new Error('Modifier option not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return option;
  },

  async deleteOption(id: string, storeId: string) {
    const [option] = await db
      .delete(modifierOptions)
      .where(and(eq(modifierOptions.id, id), eq(modifierOptions.storeId, storeId)))
      .returning();

    if (!option) {
      throw Object.assign(new Error('Modifier option not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return option;
  },
};