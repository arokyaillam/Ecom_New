// Return service — business logic and orchestration
import { returnRepo } from './return.repo.js';
import { orderRepo } from '../order/order.repo.js';
import { ErrorCodes } from '../../errors/codes.js';

export const returnService = {
  async createReturn(data: {
    storeId: string;
    orderId: string;
    customerId?: string;
    reason: string;
    notes?: string;
    items: { orderItemId: string; quantity: number; reason?: string; condition?: string }[];
  }) {
    const order = await orderRepo.findById(data.orderId, data.storeId);
    if (!order) {
      throw Object.assign(new Error('Order not found'), { code: ErrorCodes.ORDER_NOT_FOUND });
    }
    if (order.status === 'cancelled') {
      throw Object.assign(new Error('Order is cancelled'), { code: ErrorCodes.ORDER_CANCELLED });
    }

    const ret = await returnRepo.create({
      storeId: data.storeId,
      orderId: data.orderId,
      customerId: data.customerId,
      status: 'requested',
      reason: data.reason,
      notes: data.notes,
    });

    for (const item of data.items) {
      await returnRepo.createItem({
        returnId: ret.id,
        orderItemId: item.orderItemId,
        quantity: item.quantity,
        reason: item.reason,
        condition: item.condition,
      });
    }

    return returnRepo.findByIdWithItems(ret.id);
  },

  async updateStatus(returnId: string, storeId: string, newStatus: string, adminNotes?: string) {
    const ret = await returnRepo.findById(returnId);
    if (!ret || ret.storeId !== storeId) {
      throw Object.assign(new Error('Return not found'), { code: ErrorCodes.RETURN_NOT_FOUND });
    }

    const validTransitions: Record<string, string[]> = {
      requested: ['approved', 'rejected', 'cancelled'],
      approved: ['received', 'cancelled'],
      received: ['inspected'],
      inspected: ['refunded', 'rejected'],
      rejected: [],
      refunded: [],
      cancelled: [],
    };

    if (!validTransitions[ret.status]?.includes(newStatus)) {
      throw Object.assign(
        new Error(`Invalid status transition from ${ret.status} to ${newStatus}`),
        { code: ErrorCodes.RETURN_INVALID_STATUS },
      );
    }

    const extra: Partial<typeof ret> = {};
    if (adminNotes) extra.adminNotes = adminNotes;
    if (newStatus === 'received') extra.receivedAt = new Date();
    if (newStatus === 'inspected') extra.inspectedAt = new Date();
    if (newStatus === 'refunded') extra.refundedAt = new Date();

    return returnRepo.updateStatus(returnId, newStatus, extra);
  },

  async listReturns(storeId: string, page = 1, limit = 20) {
    return returnRepo.findByStore(storeId, page, limit);
  },

  async getReturn(id: string, storeId: string) {
    const ret = await returnRepo.findByIdWithItems(id);
    if (!ret || ret.storeId !== storeId) {
      throw Object.assign(new Error('Return not found'), { code: ErrorCodes.RETURN_NOT_FOUND });
    }
    return ret;
  },
};
