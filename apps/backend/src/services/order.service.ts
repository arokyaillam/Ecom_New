// Order Service - Order management with items, transaction support
import { db } from '../db/index.js';
import { orders, orderItems, products, carts, cartItems, coupons } from '../db/schema.js';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { ErrorCodes } from '../errors/codes.js';

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export const orderService = {
  async findByStoreId(storeId: string, opts?: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const conditions = [eq(orders.storeId, storeId)];
    if (opts?.status) {
      conditions.push(eq(orders.status, opts.status));
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    const [rows, totalResult] = await Promise.all([
      db.query.orders.findMany({
        where,
        orderBy: desc(orders.createdAt),
        limit,
        offset,
        with: {
          customer: {
            columns: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              storeId: true,
            },
          },
          items: true,
          coupon: true,
        },
      }),
      db.select({ count: count() })
        .from(orders)
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

  async findById(orderId: string, storeId: string) {
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.storeId, storeId)),
      with: {
        customer: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            storeId: true,
          },
        },
        items: {
          with: {
            product: true,
          },
        },
        coupon: true,
      },
    });

    if (!order) {
      throw Object.assign(new Error('Order not found'), {
        code: ErrorCodes.ORDER_NOT_FOUND,
      });
    }

    return order;
  },

  async create(data: {
    storeId: string;
    customerId?: string;
    email: string;
    phone?: string;
    currency: string;
    subtotal: string;
    tax?: string;
    shipping?: string;
    discount?: string;
    total: string;
    items: Array<{
      productId: string;
      productTitle: string;
      productImage?: string;
      variantName?: string;
      quantity: number;
      price: string;
      total: string;
      modifiers?: unknown;
    }>;
    cartId?: string;
    billingAddress?: Partial<typeof orders.$inferInsert>;
    shippingAddress?: Partial<typeof orders.$inferInsert>;
    paymentMethod?: string;
    couponId?: string;
    couponCode?: string;
    notes?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const orderNumber = generateOrderNumber();

    const result = await db.transaction(async (tx) => {
      // Create the order
      const [order] = await tx.insert(orders).values({
        storeId: data.storeId,
        customerId: data.customerId,
        orderNumber,
        email: data.email,
        phone: data.phone,
        currency: data.currency,
        subtotal: data.subtotal,
        tax: data.tax,
        shipping: data.shipping,
        discount: data.discount,
        total: data.total,
        billingName: data.billingAddress?.billingName,
        billingFirstName: data.billingAddress?.billingFirstName,
        billingLastName: data.billingAddress?.billingLastName,
        billingAddressLine1: data.billingAddress?.billingAddressLine1,
        billingAddressLine2: data.billingAddress?.billingAddressLine2,
        billingCity: data.billingAddress?.billingCity,
        billingState: data.billingAddress?.billingState,
        billingCountry: data.billingAddress?.billingCountry,
        billingPostalCode: data.billingAddress?.billingPostalCode,
        shippingName: data.shippingAddress?.shippingName,
        shippingFirstName: data.shippingAddress?.shippingFirstName,
        shippingLastName: data.shippingAddress?.shippingLastName,
        shippingAddressLine1: data.shippingAddress?.shippingAddressLine1,
        shippingAddressLine2: data.shippingAddress?.shippingAddressLine2,
        shippingCity: data.shippingAddress?.shippingCity,
        shippingState: data.shippingAddress?.shippingState,
        shippingCountry: data.shippingAddress?.shippingCountry,
        shippingPostalCode: data.shippingAddress?.shippingPostalCode,
        paymentMethod: data.paymentMethod,
        couponId: data.couponId,
        couponCode: data.couponCode,
        notes: data.notes,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      }).returning();

      // Create order items
      if (data.items.length > 0) {
        await tx.insert(orderItems).values(
          data.items.map((item) => ({
            orderId: order.id,
            storeId: data.storeId,
            productId: item.productId,
            productTitle: item.productTitle,
            productImage: item.productImage,
            variantName: item.variantName,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            modifiers: item.modifiers as typeof orderItems.$inferInsert extends { modifiers: infer M } ? M : never,
          })),
        );
      }

      // Update product quantities (scoped to store)
      for (const item of data.items) {
        await tx
          .update(products)
          .set({
            currentQuantity: sql`${products.currentQuantity} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(and(eq(products.id, item.productId), eq(products.storeId, data.storeId)));
      }

      // Clear the cart if cartId is provided
      if (data.cartId) {
        await tx.delete(cartItems).where(eq(cartItems.cartId, data.cartId));
        await tx
          .update(carts)
          .set({
            subtotal: '0',
            total: '0',
            itemCount: 0,
            couponCode: null,
            couponDiscount: '0',
            updatedAt: new Date(),
          })
          .where(eq(carts.id, data.cartId));
      }

      // Increment coupon usage count if a coupon was applied
      if (data.couponId) {
        await tx
          .update(coupons)
          .set({
            usageCount: sql`${coupons.usageCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(coupons.id, data.couponId));
      }

      return order;
    });

    return this.findById(result.id, data.storeId);
  },

  async updateStatus(orderId: string, storeId: string, status: string) {
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.storeId, storeId)),
    });

    if (!order) {
      throw Object.assign(new Error('Order not found'), {
        code: ErrorCodes.ORDER_NOT_FOUND,
      });
    }

    if (order.status === 'cancelled') {
      throw Object.assign(new Error('Order is already cancelled'), {
        code: ErrorCodes.ORDER_CANCELLED,
      });
    }

    if (order.fulfillmentStatus === 'fulfilled' && status === 'cancelled') {
      throw Object.assign(new Error('Cannot cancel a fulfilled order'), {
        code: ErrorCodes.ORDER_ALREADY_FULFILLED,
      });
    }

    const updateData: Partial<typeof orders.$inferInsert> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'shipped') {
      updateData.shippedAt = new Date();
      updateData.fulfillmentStatus = 'shipped';
    }

    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
      updateData.fulfillmentStatus = 'fulfilled';
    }

    if (status === 'cancelled') {
      // Restore product quantities for cancelled order (within store tenant)
      const items = await db.query.orderItems.findMany({
        where: eq(orderItems.orderId, orderId),
      });

      const updated = await db.transaction(async (tx) => {
        for (const item of items) {
          if (item.productId) {
            await tx
              .update(products)
              .set({
                currentQuantity: sql`${products.currentQuantity} + ${item.quantity}`,
                updatedAt: new Date(),
              })
              .where(and(eq(products.id, item.productId), eq(products.storeId, storeId)));
          }
        }

        const [result] = await tx
          .update(orders)
          .set(updateData)
          .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
          .returning();

        return result;
      });

      return updated;
    }

    const [updated] = await db
      .update(orders)
      .set(updateData)
      .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
      .returning();

    return updated;
  },
};