// Integration tests for Return service — hits the real database.
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { db } from '../../db/index.js';
import { returns, returnItems, stores, orders, orderItems, customers } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { returnService } from './return.service.js';
import { returnRepo } from './return.repo.js';

let storeId: string;
let orderId: string;
let customerId: string;
let orderItemId: string;
let createdStore = false;
let createdCustomer = false;
let createdOrder = false;
let createdOrderItem = false;
let testReturnId: string;

beforeAll(async () => {
  let store = await db.query.stores.findFirst();
  let customer = await db.query.customers.findFirst();
  let order = await db.query.orders.findFirst();
  let orderItem = await db.query.orderItems.findFirst();

  if (!store) {
    [store] = await db
      .insert(stores)
      .values({
        name: 'Return Service Test Store',
        domain: `rs-test-${Date.now()}.local`,
        ownerEmail: `rs-owner-${Date.now()}@test.local`,
        status: 'active',
      })
      .returning();
    createdStore = true;
  }
  if (!customer) {
    [customer] = await db
      .insert(customers)
      .values({
        storeId: store.id,
        email: `rs-customer-${Date.now()}@test.local`,
        password: 'password123',
      })
      .returning();
    createdCustomer = true;
  }
  if (!order) {
    [order] = await db
      .insert(orders)
      .values({
        storeId: store.id,
        customerId: customer.id,
        orderNumber: `RS-ORD-${Date.now()}`,
        email: customer.email,
        currency: 'USD',
        subtotal: '100.00',
        total: '100.00',
      })
      .returning();
    createdOrder = true;
  }
  if (!orderItem) {
    [orderItem] = await db
      .insert(orderItems)
      .values({
        orderId: order.id,
        storeId: store.id,
        productTitle: 'RS Test Product',
        quantity: 2,
        price: '29.99',
        total: '59.98',
      })
      .returning();
    createdOrderItem = true;
  }

  storeId = store.id;
  customerId = customer.id;
  orderId = order.id;
  orderItemId = orderItem.id;
});

beforeEach(async () => {
  const ret = await returnRepo.create({
    storeId,
    orderId,
    customerId,
    status: 'requested',
    reason: 'Defective',
    notes: 'Please replace',
  });
  testReturnId = ret.id;

  await returnRepo.createItem({
    returnId: testReturnId,
    orderItemId,
    quantity: 1,
    reason: 'Broken',
    condition: 'damaged',
  });
});

afterEach(async () => {
  await db.delete(returnItems).where(eq(returnItems.returnId, testReturnId));
  await db.delete(returns).where(eq(returns.id, testReturnId));
});

afterAll(async () => {
  if (createdOrderItem) {
    await db.delete(orderItems).where(eq(orderItems.id, orderItemId));
  }
  if (createdOrder) {
    await db.delete(orders).where(eq(orders.id, orderId));
  }
  if (createdCustomer) {
    await db.delete(customers).where(eq(customers.id, customerId));
  }
  if (createdStore) {
    await db.delete(stores).where(eq(stores.id, storeId));
  }
});

// ═══════════════════════════════════════════
// createReturn
// ═══════════════════════════════════════════
describe('createReturn', () => {
  it('creates a return with items for a valid order', async () => {
    const result = await returnService.createReturn({
      storeId,
      orderId,
      customerId,
      reason: 'Too big',
      items: [{ orderItemId, quantity: 1, reason: 'Sizing issue' }],
    });

    expect(result).toBeDefined();
    expect(result!.id).toBeDefined();
    expect(result!.storeId).toBe(storeId);
    expect(result!.status).toBe('requested');
    expect(Array.isArray(result!.items)).toBe(true);
    expect(result!.items.length).toBe(1);

    // Clean up
    const ids = result!.items.map((i: any) => i.id);
    for (const id of ids) await db.delete(returnItems).where(eq(returnItems.id, id));
    await db.delete(returns).where(eq(returns.id, result!.id));
  });

  it('throws ORDER_NOT_FOUND for nonexistent order', async () => {
    await expect(
      returnService.createReturn({
        storeId,
        orderId: '00000000-0000-0000-0000-000000000000',
        reason: 'Test',
        items: [{ orderItemId, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
  });

  it('throws ORDER_CANCELLED for cancelled order', async () => {
    const [cancelledOrder] = await db
      .insert(orders)
      .values({
        storeId,
        customerId,
        orderNumber: `CANCEL-${Date.now()}`,
        email: 'cancel@test.local',
        currency: 'USD',
        subtotal: '10.00',
        total: '10.00',
        status: 'cancelled',
      })
      .returning();

    await expect(
      returnService.createReturn({
        storeId,
        orderId: cancelledOrder.id,
        reason: 'Test',
        items: [{ orderItemId, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'ORDER_CANCELLED' });

    await db.delete(orders).where(eq(orders.id, cancelledOrder.id));
  });
});

// ═══════════════════════════════════════════
// updateStatus
// ═══════════════════════════════════════════
describe('updateStatus', () => {
  it('approves a requested return', async () => {
    const result = await returnService.updateStatus(testReturnId, storeId, 'approved', 'Looks good');
    expect(result).toBeDefined();
    expect(result!.status).toBe('approved');
    expect(result!.adminNotes).toBe('Looks good');
  });

  it('rejects invalid status transitions', async () => {
    await expect(returnService.updateStatus(testReturnId, storeId, 'refunded')).rejects.toMatchObject({
      code: 'RETURN_INVALID_STATUS',
    });
  });

  it('throws RETURN_NOT_FOUND for wrong store', async () => {
    await expect(
      returnService.updateStatus(testReturnId, '00000000-0000-0000-0000-000000000000', 'approved'),
    ).rejects.toMatchObject({ code: 'RETURN_NOT_FOUND' });
  });
});

// ═══════════════════════════════════════════
// getReturn
// ═══════════════════════════════════════════
describe('getReturn', () => {
  it('returns a return with items', async () => {
    const result = await returnService.getReturn(testReturnId, storeId);
    expect(result).toBeDefined();
    expect(result!.id).toBe(testReturnId);
    expect(Array.isArray(result!.items)).toBe(true);
  });

  it('throws RETURN_NOT_FOUND for wrong store', async () => {
    await expect(returnService.getReturn(testReturnId, '00000000-0000-0000-0000-000000000000')).rejects.toMatchObject({
      code: 'RETURN_NOT_FOUND',
    });
  });
});

// ═══════════════════════════════════════════
// listReturns
// ═══════════════════════════════════════════
describe('listReturns', () => {
  it('returns returns for the store', async () => {
    const result = await returnService.listReturns(storeId, 1, 20);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.data.some((r) => r.id === testReturnId)).toBe(true);
  });
});
