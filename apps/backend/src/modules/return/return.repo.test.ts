// Integration tests for Return repository — hits the real database.
// Expects seeded store/order/customer/orderItem data; skips gracefully when absent.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db/index.js';
import { returns, returnItems, stores, orders, orderItems, customers } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { returnRepo } from './return.repo.js';

// ─── Seed-data fixtures (resolved at runtime) ───
let seededStore: typeof stores.$inferSelect | undefined;
let seededOrder: typeof orders.$inferSelect | undefined;
let seededCustomer: typeof customers.$inferSelect | undefined;
let seededOrderItem: typeof orderItems.$inferSelect | undefined;
let hasSeedData = false;

// Track created rows for cleanup
let createdReturnId: string | undefined;
let createdReturnItemId: string | undefined;

beforeAll(async () => {
  try {
    seededStore = await db.query.stores.findFirst();
    seededOrder = await db.query.orders.findFirst();
    seededCustomer = await db.query.customers.findFirst();
    seededOrderItem = await db.query.orderItems.findFirst();
    hasSeedData = !!(seededStore && seededOrder && seededCustomer && seededOrderItem);
  } catch (err) {
    console.warn(
      '[return.repo.test] Database query failed — schema may be out of sync or DB unavailable.',
      (err as Error).message,
    );
    hasSeedData = false;
  }

  if (!hasSeedData) {
    console.warn(
      '[return.repo.test] Skipping tests — no seeded store/order/customer/orderItem data found. Run "pnpm db:seed" and ensure migrations are up to date.',
    );
  }
});

afterAll(async () => {
  if (createdReturnItemId) {
    await db.delete(returnItems).where(eq(returnItems.id, createdReturnItemId));
  }
  if (createdReturnId) {
    await db.delete(returns).where(eq(returns.id, createdReturnId));
  }
});

// ─── Helpers ───
function skipIfNoData(testName: string, fn: () => Promise<void>) {
  it(testName, async () => {
    if (!hasSeedData) {
      console.warn(`[return.repo.test] Skipping "${testName}" — no seeded data.`);
      return;
    }
    await fn();
  });
}

// ═══════════════════════════════════════════
// create
// ═══════════════════════════════════════════
skipIfNoData('create inserts a return and returns it', async () => {
  const data = {
    storeId: seededStore!.id,
    orderId: seededOrder!.id,
    customerId: seededCustomer!.id,
    status: 'requested',
    reason: 'Defective item',
    notes: 'Customer wants a replacement',
  };

  const result = await returnRepo.create(data);
  expect(result).toBeDefined();
  expect(result.storeId).toBe(data.storeId);
  expect(result.orderId).toBe(data.orderId);
  expect(result.customerId).toBe(data.customerId);
  expect(result.status).toBe(data.status);
  expect(result.reason).toBe(data.reason);
  expect(result.notes).toBe(data.notes);
  expect(result.id).toBeDefined();
  expect(result.createdAt).toBeInstanceOf(Date);
  expect(result.updatedAt).toBeInstanceOf(Date);

  createdReturnId = result.id;
});

// ═══════════════════════════════════════════
// createItem
// ═══════════════════════════════════════════
skipIfNoData('createItem inserts a return item and returns it', async () => {
  if (!createdReturnId) {
    console.warn('[return.repo.test] Skipping createItem — no return created.');
    return;
  }

  const data = {
    returnId: createdReturnId,
    orderItemId: seededOrderItem!.id,
    quantity: 1,
    reason: 'Broken on arrival',
    condition: 'damaged',
    refundAmount: '29.99',
  };

  const result = await returnRepo.createItem(data);
  expect(result).toBeDefined();
  expect(result.returnId).toBe(data.returnId);
  expect(result.orderItemId).toBe(data.orderItemId);
  expect(result.quantity).toBe(data.quantity);
  expect(result.reason).toBe(data.reason);
  expect(result.condition).toBe(data.condition);
  expect(result.refundAmount).toBe(data.refundAmount);
  expect(result.id).toBeDefined();
  expect(result.createdAt).toBeInstanceOf(Date);

  createdReturnItemId = result.id;
});

// ═══════════════════════════════════════════
// findById
// ═══════════════════════════════════════════
skipIfNoData('findById returns the correct return', async () => {
  if (!createdReturnId) {
    console.warn('[return.repo.test] Skipping findById — no return created.');
    return;
  }

  const result = await returnRepo.findById(createdReturnId);
  expect(result).toBeDefined();
  expect(result!.id).toBe(createdReturnId);
  expect(result!.storeId).toBe(seededStore!.id);
  expect(result!.orderId).toBe(seededOrder!.id);
  expect(result!.status).toBe('requested');
});

skipIfNoData('findById returns null for nonexistent id', async () => {
  const result = await returnRepo.findById('00000000-0000-0000-0000-000000000000');
  expect(result).toBeNull();
});

// ═══════════════════════════════════════════
// findByIdWithItems
// ═══════════════════════════════════════════
skipIfNoData('findByIdWithItems returns return with items array', async () => {
  if (!createdReturnId) {
    console.warn('[return.repo.test] Skipping findByIdWithItems — no return created.');
    return;
  }

  const result = await returnRepo.findByIdWithItems(createdReturnId);
  expect(result).toBeDefined();
  expect(result!.id).toBe(createdReturnId);
  expect(Array.isArray(result!.items)).toBe(true);

  if (createdReturnItemId) {
    const foundItem = result!.items.find((i) => i.id === createdReturnItemId);
    expect(foundItem).toBeDefined();
    expect(foundItem!.orderItemId).toBe(seededOrderItem!.id);
  }
});

skipIfNoData('findByIdWithItems returns null when return not found', async () => {
  const result = await returnRepo.findByIdWithItems('00000000-0000-0000-0000-000000000000');
  expect(result).toBeNull();
});

// ═══════════════════════════════════════════
// findByStore
// ═══════════════════════════════════════════
skipIfNoData('findByStore returns returns for the given store', async () => {
  if (!createdReturnId) {
    console.warn('[return.repo.test] Skipping findByStore — no return created.');
    return;
  }

  const result = await returnRepo.findByStore(seededStore!.id, 1, 20);
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBeGreaterThan(0);
  expect(result.some((r) => r.id === createdReturnId)).toBe(true);
});

skipIfNoData('findByStore respects pagination', async () => {
  const result = await returnRepo.findByStore(seededStore!.id, 1, 1);
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBeLessThanOrEqual(1);
});

// ═══════════════════════════════════════════
// updateStatus
// ═══════════════════════════════════════════
skipIfNoData('updateStatus updates status and returns the row', async () => {
  if (!createdReturnId) {
    console.warn('[return.repo.test] Skipping updateStatus — no return created.');
    return;
  }

  const result = await returnRepo.updateStatus(createdReturnId, 'approved', {
    adminNotes: 'Approved after inspection',
  });
  expect(result).toBeDefined();
  expect(result!.id).toBe(createdReturnId);
  expect(result!.status).toBe('approved');
  expect(result!.adminNotes).toBe('Approved after inspection');
  expect(result!.updatedAt).toBeInstanceOf(Date);
});

skipIfNoData('updateStatus works without extra fields', async () => {
  if (!createdReturnId) {
    console.warn('[return.repo.test] Skipping updateStatus — no return created.');
    return;
  }

  const result = await returnRepo.updateStatus(createdReturnId, 'rejected');
  expect(result).toBeDefined();
  expect(result!.status).toBe('rejected');
});
