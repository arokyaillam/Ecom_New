// Address Service - Customer address CRUD
import { db } from '../db/index.js';
import { customerAddresses } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { ErrorCodes } from '../errors/codes.js';

export const addressService = {
  async listAddresses(customerId: string, storeId: string) {
    return db.query.customerAddresses.findMany({
      where: and(eq(customerAddresses.customerId, customerId), eq(customerAddresses.storeId, storeId)),
    });
  },

  async createAddress(customerId: string, storeId: string, data: {
    name: string; firstName: string; lastName: string;
    addressLine1: string; addressLine2?: string;
    city: string; state?: string; country: string; postalCode: string;
    phone?: string; isDefault?: boolean;
  }) {
    // If setting as default, clear other defaults first
    if (data.isDefault) {
      await db.update(customerAddresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(eq(customerAddresses.customerId, customerId), eq(customerAddresses.storeId, storeId)));
    }

    const [address] = await db.insert(customerAddresses).values({
      customerId,
      storeId,
      ...data,
    }).returning();
    return address;
  },

  async getAddress(addressId: string, customerId: string, storeId: string) {
    return db.query.customerAddresses.findFirst({
      where: and(
        eq(customerAddresses.id, addressId),
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.storeId, storeId),
      ),
    });
  },

  async updateAddress(addressId: string, customerId: string, storeId: string, data: Partial<{
    name: string; firstName: string; lastName: string;
    addressLine1: string; addressLine2: string;
    city: string; state: string; country: string; postalCode: string;
    phone: string; isDefault: boolean;
  }>) {
    if (data.isDefault) {
      await db.update(customerAddresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(eq(customerAddresses.customerId, customerId), eq(customerAddresses.storeId, storeId)));
    }

    const [updated] = await db.update(customerAddresses)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(customerAddresses.id, addressId),
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.storeId, storeId),
      ))
      .returning();
    if (!updated) throw Object.assign(new Error('Address not found'), { code: ErrorCodes.ADDRESS_NOT_FOUND });
    return updated;
  },

  async deleteAddress(addressId: string, customerId: string, storeId: string) {
    const result = await db.delete(customerAddresses)
      .where(and(
        eq(customerAddresses.id, addressId),
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.storeId, storeId),
      ))
      .returning();
    if (result.length === 0) throw Object.assign(new Error('Address not found'), { code: ErrorCodes.ADDRESS_NOT_FOUND });
    return { deleted: true };
  },

  async setDefaultAddress(addressId: string, customerId: string, storeId: string) {
    // Clear all defaults
    await db.update(customerAddresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(and(eq(customerAddresses.customerId, customerId), eq(customerAddresses.storeId, storeId)));

    // Set new default
    const [updated] = await db.update(customerAddresses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(
        eq(customerAddresses.id, addressId),
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.storeId, storeId),
      ))
      .returning();
    if (!updated) throw Object.assign(new Error('Address not found'), { code: ErrorCodes.ADDRESS_NOT_FOUND });
    return updated;
  },
};