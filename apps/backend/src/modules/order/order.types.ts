// Order type definitions
import type { orders, orderItems } from '../../db/schema.js';

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export interface CreateOrderData {
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
  billingAddress?: Partial<NewOrder>;
  shippingAddress?: Partial<NewOrder>;
  paymentMethod?: string;
  couponId?: string;
  couponCode?: string;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
}