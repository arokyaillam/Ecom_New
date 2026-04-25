// Inventory service — business logic, calls Drizzle directly for atomic transactions.
import { db } from '../../db/index.js';
import { products, inventoryHistory, categories, users } from '../../db/schema.js';
import { eq, and, desc, sql, ilike, or, lte, gt } from 'drizzle-orm';
import { ErrorCodes } from '../../errors/codes.js';
import { notificationService } from '../notification/notification.service.js';

export const inventoryService = {
  async findByStoreId(
    storeId: string,
    opts: {
      page: number;
      limit: number;
      filter: 'all' | 'lowStock' | 'outOfStock';
      search?: string;
    },
  ) {
    const page = Math.max(1, opts.page);
    const limit = Math.max(1, Math.min(opts.limit, 100));
    const offset = (page - 1) * limit;

    const conditions: Array<ReturnType<typeof eq> | ReturnType<typeof and> | ReturnType<typeof or>> = [
      eq(products.storeId, storeId),
    ];

    if (opts.filter === 'lowStock') {
      conditions.push(
        and(
          gt(products.currentQuantity, 0),
          sql`${products.currentQuantity} <= COALESCE(${products.lowStockThreshold}, 10)`,
        )!,
      );
    } else if (opts.filter === 'outOfStock') {
      conditions.push(
        lte(products.currentQuantity, 0),
      );
    }

    if (opts.search) {
      const pattern = `%${opts.search}%`;
      conditions.push(
        or(
          ilike(products.titleEn, pattern),
          ilike(products.titleAr, pattern),
        )!,
      );
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    const [rows, totalResult] = await Promise.all([
      db
        .select({
          id: products.id,
          titleEn: products.titleEn,
          titleAr: products.titleAr,
          currentQuantity: products.currentQuantity,
          lowStockThreshold: products.lowStockThreshold,
          isPublished: products.isPublished,
          category: {
            id: categories.id,
            nameEn: categories.nameEn,
            nameAr: categories.nameAr,
          },
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(where)
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(where),
    ]);

    return {
      items: rows,
      total: totalResult[0]?.count ?? 0,
    };
  },

  async updateStock(
    productId: string,
    storeId: string,
    userId: string | undefined,
    data: {
      currentQuantity: number;
      lowStockThreshold?: number;
      reason?: string;
    },
  ) {
    const result = await db.transaction(async (tx) => {
      // Read current product within transaction for consistency
      const [product] = await tx
        .select({
          id: products.id,
          titleEn: products.titleEn,
          currentQuantity: products.currentQuantity,
          lowStockThreshold: products.lowStockThreshold,
        })
        .from(products)
        .where(and(eq(products.id, productId), eq(products.storeId, storeId)));

      if (!product) {
        throw Object.assign(new Error('Product not found'), {
          code: ErrorCodes.PRODUCT_NOT_FOUND,
        });
      }

      const previousQty = product.currentQuantity ?? 0;
      const newQty = data.currentQuantity;
      const changeQty = newQty - previousQty;

      // Update product quantity and optionally threshold
      const updateData: Partial<typeof products.$inferInsert> = {
        currentQuantity: newQty,
        updatedAt: new Date(),
      };
      if (data.lowStockThreshold !== undefined) {
        updateData.lowStockThreshold = data.lowStockThreshold;
      }

      const [updated] = await tx
        .update(products)
        .set(updateData)
        .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
        .returning();

      // Insert history record
      await tx.insert(inventoryHistory).values({
        productId,
        storeId,
        changeQty,
        previousQty,
        newQty,
        reason: data.reason ?? null,
        userId: userId ?? null,
        createdAt: new Date(),
      });

      return updated;
    });

    // Low stock notification (outside transaction)
    if (result && (result.currentQuantity ?? 0) <= (result.lowStockThreshold ?? 10)) {
      try {
        await notificationService.createNotification(storeId, {
          type: 'inventory',
          title: 'Low stock alert',
          message: `${result.titleEn} is now at ${result.currentQuantity} units`,
          linkUrl: `/dashboard/inventory`,
          metadata: { productId, quantity: result.currentQuantity },
        });
      } catch {
        // Non-blocking
      }
    }

    return result;
  },

  async getHistory(
    productId: string,
    storeId: string,
    opts: {
      page: number;
      limit: number;
    },
  ) {
    const page = Math.max(1, opts.page);
    const limit = Math.max(1, Math.min(opts.limit, 100));
    const offset = (page - 1) * limit;

    const [rows, totalResult] = await Promise.all([
      db
        .select({
          id: inventoryHistory.id,
          productId: inventoryHistory.productId,
          changeQty: inventoryHistory.changeQty,
          previousQty: inventoryHistory.previousQty,
          newQty: inventoryHistory.newQty,
          reason: inventoryHistory.reason,
          createdAt: inventoryHistory.createdAt,
          userEmail: users.email,
        })
        .from(inventoryHistory)
        .leftJoin(users, eq(inventoryHistory.userId, users.id))
        .where(and(eq(inventoryHistory.productId, productId), eq(inventoryHistory.storeId, storeId)))
        .orderBy(desc(inventoryHistory.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(inventoryHistory)
        .where(and(eq(inventoryHistory.productId, productId), eq(inventoryHistory.storeId, storeId))),
    ]);

    return {
      items: rows,
      total: totalResult[0]?.count ?? 0,
    };
  },
};
