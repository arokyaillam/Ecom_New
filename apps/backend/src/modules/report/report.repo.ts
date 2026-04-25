// Report repository — Drizzle queries for CSV exports
import { db } from '../../db/index.js';
import { orders, customers, products, categories } from '../../db/schema.js';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export const reportRepo = {
  async findOrdersForSalesReport(storeId: string, startDate?: Date, endDate?: Date) {
    const conditions = [eq(orders.storeId, storeId)];
    if (startDate) conditions.push(gte(orders.createdAt, startDate));
    if (endDate) conditions.push(lte(orders.createdAt, endDate));

    return db
      .select({
        orderNumber: orders.orderNumber,
        createdAt: orders.createdAt,
        email: orders.email,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        subtotal: orders.subtotal,
        tax: orders.tax,
        shipping: orders.shipping,
        discount: orders.discount,
        total: orders.total,
      })
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));
  },

  async findCustomersForReport(storeId: string) {
    return db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        isVerified: customers.isVerified,
        isBlocked: customers.isBlocked,
        blockedAt: customers.blockedAt,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .where(eq(customers.storeId, storeId))
      .orderBy(desc(customers.createdAt));
  },

  async findProductsForInventoryReport(storeId: string) {
    return db
      .select({
        id: products.id,
        titleEn: products.titleEn,
        categoryName: categories.nameEn,
        currentQuantity: products.currentQuantity,
        lowStockThreshold: products.lowStockThreshold,
        isPublished: products.isPublished,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.storeId, storeId))
      .orderBy(desc(products.createdAt));
  },

  async findOrdersForTaxReport(storeId: string, startDate?: Date, endDate?: Date) {
    const conditions = [eq(orders.storeId, storeId)];
    if (startDate) conditions.push(gte(orders.createdAt, startDate));
    if (endDate) conditions.push(lte(orders.createdAt, endDate));

    return db
      .select({
        orderNumber: orders.orderNumber,
        createdAt: orders.createdAt,
        subtotal: orders.subtotal,
        tax: orders.tax,
        total: orders.total,
      })
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));
  },
};
