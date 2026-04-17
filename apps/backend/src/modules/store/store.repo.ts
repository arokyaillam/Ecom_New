// Store repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { stores } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export type StoreSelect = typeof stores.$inferSelect;
export type StoreInsert = typeof stores.$inferInsert;

export const storeRepo = {
  findById(storeId: string) {
    return db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });
  },

  findByDomain(domain: string) {
    return db.query.stores.findFirst({
      where: eq(stores.domain, domain),
    });
  },

  findByOwnerId(ownerEmail: string) {
    return db.query.stores.findFirst({
      where: eq(stores.ownerEmail, ownerEmail),
    });
  },

  create(data: StoreInsert) {
    return db.insert(stores).values(data).returning();
  },

  update(storeId: string, data: Partial<StoreInsert>) {
    return db
      .update(stores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning();
  },
};