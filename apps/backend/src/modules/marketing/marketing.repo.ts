// Marketing repository — Drizzle queries only, no business logic
import { db } from '../../db/index.js';
import { banners } from '../../db/schema.js';
import { eq, and, asc, count } from 'drizzle-orm';

export type BannerSelect = typeof banners.$inferSelect;
export type BannerInsert = typeof banners.$inferInsert;

export const marketingRepo = {
  findManyByStoreId(storeId: string, options?: { limit?: number; offset?: number }) {
    return db.query.banners.findMany({
      where: eq(banners.storeId, storeId),
      orderBy: asc(banners.sortOrder),
      limit: options?.limit,
      offset: options?.offset,
    });
  },

  countByStoreId(storeId: string) {
    return db
      .select({ count: count() })
      .from(banners)
      .where(eq(banners.storeId, storeId));
  },

  findById(bannerId: string, storeId: string) {
    return db.query.banners.findFirst({
      where: and(eq(banners.id, bannerId), eq(banners.storeId, storeId)),
    });
  },

  create(data: BannerInsert) {
    return db.insert(banners).values(data).returning();
  },

  update(bannerId: string, storeId: string, data: Partial<BannerInsert>) {
    return db
      .update(banners)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(banners.id, bannerId), eq(banners.storeId, storeId)))
      .returning();
  },

  deleteById(bannerId: string, storeId: string) {
    return db
      .delete(banners)
      .where(and(eq(banners.id, bannerId), eq(banners.storeId, storeId)));
  },

  async reorder(storeId: string, ids: string[]) {
    // Batch update sortOrder for each banner in the order provided
    const results = [];
    for (let i = 0; i < ids.length; i++) {
      const [updated] = await db
        .update(banners)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(and(eq(banners.id, ids[i]), eq(banners.storeId, storeId)))
        .returning();
      if (updated) results.push(updated);
    }
    return results;
  },
};
