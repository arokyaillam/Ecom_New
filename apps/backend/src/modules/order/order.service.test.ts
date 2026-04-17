// Unit tests for orderService — business logic with mocked orderRepo and db.
// Tests cover CRUD, transactional order creation (with inventory decrement, coupon usage),
// updateStatus (including cancellation with inventory restore), and error cases.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock orderRepo ───
vi.mock('./order.repo.js', () => ({
  orderRepo: {
    findByStoreId: vi.fn(),
    findById: vi.fn(),
    findByIdSimple: vi.fn(),
    findOrderItems: vi.fn(),
    insertOrder: vi.fn(),
    insertOrderItems: vi.fn(),
    decrementInventory: vi.fn(),
    restoreInventory: vi.fn(),
    deleteCartItems: vi.fn(),
    resetCartTotals: vi.fn(),
    findCouponById: vi.fn(),
    incrementCouponUsage: vi.fn(),
    updateOrder: vi.fn(),
  },
}));

// ─── Mock db (for db.transaction) ───
// The service imports { db } from '../../db/index.js' and calls db.transaction(async (tx) => {...}).
// We need to mock db so that db.transaction calls the callback with our fake tx object.
const mockTx = {} as any;
vi.mock('../../db/index.js', () => ({
  db: {
    transaction: vi.fn((cb: Function) => cb(mockTx)),
  },
}));

import { orderService } from './order.service.js';
import { ErrorCodes } from '../../errors/codes.js';
import { orderRepo as mockOrderRepo } from './order.repo.js';
import { db as mockDb } from '../../db/index.js';

// ─── Fixtures ───
const mockOrder = {
  id: 'order-1',
  storeId: 'store-1',
  orderNumber: 'ORD-ABC123',
  email: 'customer@store.com',
  status: 'pending',
  fulfillmentStatus: 'unfulfilled',
  subtotal: '30.00',
  tax: '3.00',
  shipping: '5.99',
  discount: '0.00',
  total: '38.99',
  createdAt: new Date(),
  updatedAt: new Date(),
  customer: { id: 'cust-1', email: 'customer@store.com', storeId: 'store-1' },
  items: [
    { id: 'oi-1', orderId: 'order-1', productId: 'prod-1', productTitle: 'Product 1', quantity: 2, price: '10.00', total: '20.00' },
    { id: 'oi-2', orderId: 'order-1', productId: 'prod-2', productTitle: 'Product 2', quantity: 1, price: '10.00', total: '10.00' },
  ],
  coupon: null,
};

const mockOrderSimple = {
  id: 'order-1',
  storeId: 'store-1',
  status: 'pending',
  fulfillmentStatus: 'unfulfilled',
};

const mockCoupon = {
  id: 'coupon-1',
  code: 'SAVE10',
  usageLimit: 100,
  usageCount: 50,
};

beforeEach(() => {
  vi.clearAllMocks();
  // Reset db.transaction to default behavior (calls callback with mockTx)
  (mockDb.transaction as ReturnType<typeof vi.fn>).mockImplementation((cb: Function) => cb(mockTx));
});

// ═══════════════════════════════════════════
// findByStoreId
// ═══════════════════════════════════════════
describe('orderService.findByStoreId', () => {
  it('returns orders with pagination metadata', async () => {
    mockOrderRepo.findByStoreId.mockResolvedValueOnce({
      data: [mockOrder],
      total: 1,
    });

    const result = await orderService.findByStoreId('store-1', { page: 1, limit: 20 });

    expect(result.data).toEqual([mockOrder]);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(mockOrderRepo.findByStoreId).toHaveBeenCalledWith('store-1', {
      page: 1,
      limit: 20,
      status: undefined,
    });
  });

  it('passes status filter to repo', async () => {
    mockOrderRepo.findByStoreId.mockResolvedValueOnce({ data: [], total: 0 });

    await orderService.findByStoreId('store-1', { page: 1, limit: 20, status: 'pending' });

    expect(mockOrderRepo.findByStoreId).toHaveBeenCalledWith('store-1', {
      page: 1,
      limit: 20,
      status: 'pending',
    });
  });

  it('clamps page to minimum of 1', async () => {
    mockOrderRepo.findByStoreId.mockResolvedValueOnce({ data: [], total: 0 });

    await orderService.findByStoreId('store-1', { page: -1, limit: 20 });

    expect(mockOrderRepo.findByStoreId).toHaveBeenCalledWith('store-1', expect.objectContaining({
      page: 1,
    }));
  });

  it('clamps limit to minimum of 1', async () => {
    mockOrderRepo.findByStoreId.mockResolvedValueOnce({ data: [], total: 0 });

    await orderService.findByStoreId('store-1', { page: 1, limit: 0 });

    expect(mockOrderRepo.findByStoreId).toHaveBeenCalledWith('store-1', expect.objectContaining({
      limit: 1,
    }));
  });

  it('defaults page to 1 and limit to 20 when not provided', async () => {
    mockOrderRepo.findByStoreId.mockResolvedValueOnce({ data: [], total: 0 });

    await orderService.findByStoreId('store-1');

    expect(mockOrderRepo.findByStoreId).toHaveBeenCalledWith('store-1', {
      page: 1,
      limit: 20,
      status: undefined,
    });
  });

  it('calculates totalPages correctly', async () => {
    mockOrderRepo.findByStoreId.mockResolvedValueOnce({ data: [], total: 45 });

    const result = await orderService.findByStoreId('store-1', { page: 1, limit: 20 });

    expect(result.pagination.totalPages).toBe(3); // ceil(45/20) = 3
  });
});

// ═══════════════════════════════════════════
// findById
// ═══════════════════════════════════════════
describe('orderService.findById', () => {
  it('returns order when found', async () => {
    mockOrderRepo.findById.mockResolvedValueOnce(mockOrder);

    const result = await orderService.findById('order-1', 'store-1');
    expect(result).toEqual(mockOrder);
    expect(mockOrderRepo.findById).toHaveBeenCalledWith('order-1', 'store-1');
  });

  it('throws ORDER_NOT_FOUND when order does not exist', async () => {
    mockOrderRepo.findById.mockResolvedValueOnce(null);

    await expect(orderService.findById('nonexistent', 'store-1'))
      .rejects.toMatchObject({ code: ErrorCodes.ORDER_NOT_FOUND });
  });
});

// ═══════════════════════════════════════════
// create
// ═══════════════════════════════════════════
describe('orderService.create', () => {
  const orderData = {
    storeId: 'store-1',
    email: 'customer@store.com',
    currency: 'USD',
    subtotal: '30.00',
    tax: '3.00',
    shipping: '5.99',
    discount: '0.00',
    total: '38.99',
    items: [
      {
        productId: 'prod-1',
        productTitle: 'Product 1',
        quantity: 2,
        price: '10.00',
        total: '20.00',
      },
      {
        productId: 'prod-2',
        productTitle: 'Product 2',
        quantity: 1,
        price: '10.00',
        total: '10.00',
      },
    ],
  };

  it('creates an order with items and decrements inventory', async () => {
    const createdOrder = { id: 'order-1', orderNumber: 'ORD-XYZ', storeId: 'store-1' };
    mockOrderRepo.insertOrder.mockResolvedValueOnce(createdOrder);
    mockOrderRepo.insertOrderItems.mockResolvedValueOnce([]);
    // Inventory decrement returns rows (success)
    mockOrderRepo.decrementInventory
      .mockResolvedValueOnce([{ id: 'prod-1' }])
      .mockResolvedValueOnce([{ id: 'prod-2' }]);
    mockOrderRepo.findById.mockResolvedValueOnce(mockOrder);

    const result = await orderService.create(orderData);

    expect(mockOrderRepo.insertOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: 'store-1',
        email: 'customer@store.com',
        subtotal: '30.00',
        total: '38.99',
      }),
      mockTx,
    );
    expect(mockOrderRepo.insertOrderItems).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ productId: 'prod-1', quantity: 2 }),
        expect.objectContaining({ productId: 'prod-2', quantity: 1 }),
      ]),
      mockTx,
    );
    expect(mockOrderRepo.decrementInventory).toHaveBeenCalledTimes(2);
    expect(mockOrderRepo.decrementInventory).toHaveBeenCalledWith('prod-1', 'store-1', 2, mockTx);
    expect(mockOrderRepo.decrementInventory).toHaveBeenCalledWith('prod-2', 'store-1', 1, mockTx);
    expect(result).toEqual(mockOrder);
  });

  it('creates an order without items (empty items array)', async () => {
    const createdOrder = { id: 'order-1', orderNumber: 'ORD-XYZ', storeId: 'store-1' };
    mockOrderRepo.insertOrder.mockResolvedValueOnce(createdOrder);
    mockOrderRepo.findById.mockResolvedValueOnce(mockOrder);

    const result = await orderService.create({
      ...orderData,
      items: [],
    });

    expect(mockOrderRepo.insertOrderItems).not.toHaveBeenCalled();
    expect(mockOrderRepo.decrementInventory).not.toHaveBeenCalled();
    expect(result).toEqual(mockOrder);
  });

  it('throws INSUFFICIENT_INVENTORY when decrement returns no rows', async () => {
    const createdOrder = { id: 'order-1', orderNumber: 'ORD-XYZ', storeId: 'store-1' };
    mockOrderRepo.insertOrder.mockResolvedValueOnce(createdOrder);
    mockOrderRepo.insertOrderItems.mockResolvedValueOnce([]);
    // First item succeeds, second fails (out of stock)
    mockOrderRepo.decrementInventory
      .mockResolvedValueOnce([{ id: 'prod-1' }])
      .mockResolvedValueOnce([]); // no rows = insufficient inventory

    await expect(orderService.create(orderData))
      .rejects.toMatchObject({ code: ErrorCodes.INSUFFICIENT_INVENTORY });
  });

  it('creates order with cart cleanup when cartId is provided', async () => {
    const createdOrder = { id: 'order-1', orderNumber: 'ORD-XYZ', storeId: 'store-1' };
    mockOrderRepo.insertOrder.mockResolvedValueOnce(createdOrder);
    mockOrderRepo.insertOrderItems.mockResolvedValueOnce([]);
    mockOrderRepo.decrementInventory.mockResolvedValue([{ id: 'prod-1' }]);
    mockOrderRepo.findById.mockResolvedValueOnce(mockOrder);

    const dataWithCart = {
      ...orderData,
      items: [orderData.items[0]],
      cartId: 'cart-1',
    };

    await orderService.create(dataWithCart);

    expect(mockOrderRepo.deleteCartItems).toHaveBeenCalledWith('cart-1', mockTx);
    expect(mockOrderRepo.resetCartTotals).toHaveBeenCalledWith('cart-1', mockTx);
  });

  it('does not clean up cart when cartId is not provided', async () => {
    const createdOrder = { id: 'order-1', orderNumber: 'ORD-XYZ', storeId: 'store-1' };
    mockOrderRepo.insertOrder.mockResolvedValueOnce(createdOrder);
    mockOrderRepo.insertOrderItems.mockResolvedValueOnce([]);
    mockOrderRepo.decrementInventory.mockResolvedValue([{ id: 'prod-1' }]);
    mockOrderRepo.findById.mockResolvedValueOnce(mockOrder);

    await orderService.create({
      ...orderData,
      items: [orderData.items[0]],
    });

    expect(mockOrderRepo.deleteCartItems).not.toHaveBeenCalled();
    expect(mockOrderRepo.resetCartTotals).not.toHaveBeenCalled();
  });

  it('creates order with coupon and increments coupon usage', async () => {
    const createdOrder = { id: 'order-1', orderNumber: 'ORD-XYZ', storeId: 'store-1' };
    mockOrderRepo.insertOrder.mockResolvedValueOnce(createdOrder);
    mockOrderRepo.insertOrderItems.mockResolvedValueOnce([]);
    mockOrderRepo.decrementInventory.mockResolvedValue([{ id: 'prod-1' }]);
    mockOrderRepo.findCouponById.mockResolvedValueOnce(mockCoupon);
    mockOrderRepo.incrementCouponUsage.mockResolvedValueOnce({ ...mockCoupon, usageCount: 51 });
    mockOrderRepo.findById.mockResolvedValueOnce(mockOrder);

    await orderService.create({
      ...orderData,
      items: [orderData.items[0]],
      couponId: 'coupon-1',
    });

    expect(mockOrderRepo.findCouponById).toHaveBeenCalledWith('coupon-1', mockTx);
    expect(mockOrderRepo.incrementCouponUsage).toHaveBeenCalledWith('coupon-1', mockTx);
  });

  it('throws INVALID_COUPON when coupon is not found', async () => {
    const createdOrder = { id: 'order-1', orderNumber: 'ORD-XYZ', storeId: 'store-1' };
    mockOrderRepo.insertOrder.mockResolvedValueOnce(createdOrder);
    mockOrderRepo.insertOrderItems.mockResolvedValueOnce([]);
    mockOrderRepo.decrementInventory.mockResolvedValue([{ id: 'prod-1' }]);
    mockOrderRepo.findCouponById.mockResolvedValueOnce(null);

    await expect(
      orderService.create({
        ...orderData,
        items: [orderData.items[0]],
        couponId: 'coupon-nonexistent',
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_COUPON });
  });

  it('throws COUPON_USAGE_EXCEEDED when coupon usage limit is reached', async () => {
    const createdOrder = { id: 'order-1', orderNumber: 'ORD-XYZ', storeId: 'store-1' };
    mockOrderRepo.insertOrder.mockResolvedValueOnce(createdOrder);
    mockOrderRepo.insertOrderItems.mockResolvedValueOnce([]);
    mockOrderRepo.decrementInventory.mockResolvedValue([{ id: 'prod-1' }]);
    const usedUpCoupon = { ...mockCoupon, usageLimit: 100, usageCount: 100 };
    mockOrderRepo.findCouponById.mockResolvedValueOnce(usedUpCoupon);

    await expect(
      orderService.create({
        ...orderData,
        items: [orderData.items[0]],
        couponId: 'coupon-1',
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.COUPON_USAGE_EXCEEDED });
  });

  it('allows coupon when usageLimit is null (unlimited)', async () => {
    const createdOrder = { id: 'order-1', orderNumber: 'ORD-XYZ', storeId: 'store-1' };
    mockOrderRepo.insertOrder.mockResolvedValueOnce(createdOrder);
    mockOrderRepo.insertOrderItems.mockResolvedValueOnce([]);
    mockOrderRepo.decrementInventory.mockResolvedValue([{ id: 'prod-1' }]);
    const unlimitedCoupon = { ...mockCoupon, usageLimit: null, usageCount: 500 };
    mockOrderRepo.findCouponById.mockResolvedValueOnce(unlimitedCoupon);
    mockOrderRepo.incrementCouponUsage.mockResolvedValueOnce({ ...unlimitedCoupon });
    mockOrderRepo.findById.mockResolvedValueOnce(mockOrder);

    const result = await orderService.create({
      ...orderData,
      items: [orderData.items[0]],
      couponId: 'coupon-1',
    });

    expect(result).toEqual(mockOrder);
    expect(mockOrderRepo.incrementCouponUsage).toHaveBeenCalledWith('coupon-1', mockTx);
  });

  it('allows coupon when usageLimit is not yet reached', async () => {
    const createdOrder = { id: 'order-1', orderNumber: 'ORD-XYZ', storeId: 'store-1' };
    mockOrderRepo.insertOrder.mockResolvedValueOnce(createdOrder);
    mockOrderRepo.insertOrderItems.mockResolvedValueOnce([]);
    mockOrderRepo.decrementInventory.mockResolvedValue([{ id: 'prod-1' }]);
    const validCoupon = { ...mockCoupon, usageLimit: 100, usageCount: 50 };
    mockOrderRepo.findCouponById.mockResolvedValueOnce(validCoupon);
    mockOrderRepo.incrementCouponUsage.mockResolvedValueOnce({ ...validCoupon });
    mockOrderRepo.findById.mockResolvedValueOnce(mockOrder);

    const result = await orderService.create({
      ...orderData,
      items: [orderData.items[0]],
      couponId: 'coupon-1',
    });

    expect(result).toEqual(mockOrder);
  });

  it('passes billing and shipping address fields to insertOrder', async () => {
    const createdOrder = { id: 'order-1', orderNumber: 'ORD-XYZ', storeId: 'store-1' };
    mockOrderRepo.insertOrder.mockResolvedValueOnce(createdOrder);
    mockOrderRepo.decrementInventory.mockResolvedValue([{ id: 'prod-1' }]);
    mockOrderRepo.findById.mockResolvedValueOnce(mockOrder);

    const dataWithAddresses = {
      ...orderData,
      items: [orderData.items[0]],
      billingAddress: {
        billingName: 'John Doe',
        billingFirstName: 'John',
        billingLastName: 'Doe',
        billingAddressLine1: '123 Main St',
        billingCity: 'Springfield',
        billingState: 'IL',
        billingCountry: 'US',
        billingPostalCode: '62701',
      },
      shippingAddress: {
        shippingName: 'Jane Doe',
        shippingFirstName: 'Jane',
        shippingLastName: 'Doe',
        shippingAddressLine1: '456 Oak Ave',
        shippingCity: 'Chicago',
        shippingState: 'IL',
        shippingCountry: 'US',
        shippingPostalCode: '60601',
      },
    };

    await orderService.create(dataWithAddresses);

    expect(mockOrderRepo.insertOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        billingName: 'John Doe',
        billingFirstName: 'John',
        billingLastName: 'Doe',
        shippingName: 'Jane Doe',
        shippingFirstName: 'Jane',
        shippingLastName: 'Doe',
      }),
      mockTx,
    );
  });
});

// ═══════════════════════════════════════════
// updateStatus
// ═══════════════════════════════════════════
describe('orderService.updateStatus', () => {
  it('updates order status to shipped', async () => {
    const order = { ...mockOrderSimple, status: 'pending', fulfillmentStatus: 'unfulfilled' };
    mockOrderRepo.findByIdSimple.mockResolvedValueOnce(order);
    const updatedOrder = { ...order, status: 'shipped', fulfillmentStatus: 'shipped', shippedAt: expect.any(Date) };
    mockOrderRepo.updateOrder.mockResolvedValueOnce(updatedOrder);

    const result = await orderService.updateStatus('order-1', 'store-1', 'shipped');

    expect(mockOrderRepo.updateOrder).toHaveBeenCalledWith(
      'order-1',
      'store-1',
      expect.objectContaining({
        status: 'shipped',
        fulfillmentStatus: 'shipped',
        shippedAt: expect.any(Date),
      }),
    );
  });

  it('updates order status to delivered', async () => {
    const order = { ...mockOrderSimple, status: 'shipped', fulfillmentStatus: 'shipped' };
    mockOrderRepo.findByIdSimple.mockResolvedValueOnce(order);
    const updatedOrder = { ...order, status: 'delivered', fulfillmentStatus: 'fulfilled', deliveredAt: expect.any(Date) };
    mockOrderRepo.updateOrder.mockResolvedValueOnce(updatedOrder);

    const result = await orderService.updateStatus('order-1', 'store-1', 'delivered');

    expect(mockOrderRepo.updateOrder).toHaveBeenCalledWith(
      'order-1',
      'store-1',
      expect.objectContaining({
        status: 'delivered',
        fulfillmentStatus: 'fulfilled',
        deliveredAt: expect.any(Date),
      }),
    );
  });

  it('updates order status without transaction for non-cancel statuses', async () => {
    const order = { ...mockOrderSimple, status: 'pending' };
    mockOrderRepo.findByIdSimple.mockResolvedValueOnce(order);
    mockOrderRepo.updateOrder.mockResolvedValueOnce({ ...order, status: 'processing' });

    await orderService.updateStatus('order-1', 'store-1', 'processing');

    // db.transaction should NOT be called for non-cancel statuses
    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(mockOrderRepo.updateOrder).toHaveBeenCalledWith(
      'order-1',
      'store-1',
      expect.objectContaining({ status: 'processing' }),
    );
  });

  it('throws ORDER_NOT_FOUND when order does not exist', async () => {
    mockOrderRepo.findByIdSimple.mockResolvedValueOnce(null);

    await expect(orderService.updateStatus('nonexistent', 'store-1', 'shipped'))
      .rejects.toMatchObject({ code: ErrorCodes.ORDER_NOT_FOUND });
  });

  it('throws ORDER_CANCELLED when order is already cancelled', async () => {
    const cancelledOrder = { ...mockOrderSimple, status: 'cancelled' };
    mockOrderRepo.findByIdSimple.mockResolvedValueOnce(cancelledOrder);

    await expect(orderService.updateStatus('order-1', 'store-1', 'shipped'))
      .rejects.toMatchObject({ code: ErrorCodes.ORDER_CANCELLED });
  });

  it('throws ORDER_ALREADY_FULFILLED when trying to cancel a fulfilled order', async () => {
    const fulfilledOrder = { ...mockOrderSimple, status: 'delivered', fulfillmentStatus: 'fulfilled' };
    mockOrderRepo.findByIdSimple.mockResolvedValueOnce(fulfilledOrder);

    await expect(orderService.updateStatus('order-1', 'store-1', 'cancelled'))
      .rejects.toMatchObject({ code: ErrorCodes.ORDER_ALREADY_FULFILLED });
  });

  describe('cancellation with inventory restore', () => {
    it('cancels an order and restores inventory for all items with productId', async () => {
      const order = { ...mockOrderSimple, status: 'pending', fulfillmentStatus: 'unfulfilled' };
      mockOrderRepo.findByIdSimple.mockResolvedValueOnce(order);

      const orderItems = [
        { orderId: 'order-1', productId: 'prod-1', quantity: 2 },
        { orderId: 'order-1', productId: 'prod-2', quantity: 1 },
      ];
      mockOrderRepo.findOrderItems.mockResolvedValueOnce(orderItems);
      mockOrderRepo.updateOrder.mockResolvedValueOnce({ ...order, status: 'cancelled' });

      await orderService.updateStatus('order-1', 'store-1', 'cancelled');

      // Should use transaction for cancellation
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockOrderRepo.restoreInventory).toHaveBeenCalledTimes(2);
      expect(mockOrderRepo.restoreInventory).toHaveBeenCalledWith('prod-1', 'store-1', 2, mockTx);
      expect(mockOrderRepo.restoreInventory).toHaveBeenCalledWith('prod-2', 'store-1', 1, mockTx);
      expect(mockOrderRepo.updateOrder).toHaveBeenCalledWith(
        'order-1',
        'store-1',
        expect.objectContaining({
          status: 'cancelled',
          updatedAt: expect.any(Date),
        }),
        mockTx,
      );
    });

    it('skips items with null productId during inventory restore', async () => {
      const order = { ...mockOrderSimple, status: 'pending', fulfillmentStatus: 'unfulfilled' };
      mockOrderRepo.findByIdSimple.mockResolvedValueOnce(order);

      const orderItems = [
        { orderId: 'order-1', productId: 'prod-1', quantity: 2 },
        { orderId: 'order-1', productId: null, quantity: 1 }, // null productId — skip restore
      ];
      mockOrderRepo.findOrderItems.mockResolvedValueOnce(orderItems);
      mockOrderRepo.updateOrder.mockResolvedValueOnce({ ...order, status: 'cancelled' });

      await orderService.updateStatus('order-1', 'store-1', 'cancelled');

      expect(mockOrderRepo.restoreInventory).toHaveBeenCalledTimes(1);
      expect(mockOrderRepo.restoreInventory).toHaveBeenCalledWith('prod-1', 'store-1', 2, mockTx);
    });

    it('handles cancellation of order with no items', async () => {
      const order = { ...mockOrderSimple, status: 'pending', fulfillmentStatus: 'unfulfilled' };
      mockOrderRepo.findByIdSimple.mockResolvedValueOnce(order);

      mockOrderRepo.findOrderItems.mockResolvedValueOnce([]);
      mockOrderRepo.updateOrder.mockResolvedValueOnce({ ...order, status: 'cancelled' });

      await orderService.updateStatus('order-1', 'store-1', 'cancelled');

      expect(mockOrderRepo.restoreInventory).not.toHaveBeenCalled();
    });
  });
});