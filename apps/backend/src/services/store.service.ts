// Store Service - Core store operations
import { db } from '../db/index.js';
import { stores } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { ErrorCodes } from '../errors/codes.js';

export const storeService = {
  async findById(storeId: string) {
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });
    return store;
  },

  async findByDomain(domain: string) {
    const store = await db.query.stores.findFirst({
      where: eq(stores.domain, domain),
    });
    return store;
  },

  async findByIdOrFail(storeId: string) {
    const store = await this.findById(storeId);
    if (!store) {
      throw Object.assign(new Error('Store not found'), {
        code: ErrorCodes.STORE_NOT_FOUND,
      });
    }
    return store;
  },

  async create(data: typeof stores.$inferInsert) {
    const [store] = await db.insert(stores).values(data).returning();
    return store;
  },

  async update(storeId: string, data: Partial<typeof stores.$inferInsert>) {
    const [store] = await db
      .update(stores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning();
    return store;
  },

  async findByOwnerId(ownerEmail: string) {
    return db.query.stores.findFirst({
      where: eq(stores.ownerEmail, ownerEmail),
    });
  },
};