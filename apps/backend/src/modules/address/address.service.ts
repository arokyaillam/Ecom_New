// Address service — business logic, calls addressRepo, never imports db directly
import { addressRepo } from './address.repo.js';
import { ErrorCodes } from '../../errors/codes.js';

export const addressService = {
  async listAddresses(customerId: string, storeId: string) {
    return addressRepo.listAddresses(customerId, storeId);
  },

  async createAddress(customerId: string, storeId: string, data: {
    name: string; firstName: string; lastName: string;
    addressLine1: string; addressLine2?: string;
    city: string; state?: string; country: string; postalCode: string;
    phone?: string; isDefault?: boolean;
  }) {
    // If setting as default, clear other defaults first
    if (data.isDefault) {
      await addressRepo.clearDefaults(customerId, storeId);
    }

    const address = await addressRepo.insertAddress({
      customerId,
      storeId,
      ...data,
    });
    return address;
  },

  async getAddress(addressId: string, customerId: string, storeId: string) {
    return addressRepo.findById(addressId, customerId, storeId);
  },

  async updateAddress(addressId: string, customerId: string, storeId: string, data: Partial<{
    name: string; firstName: string; lastName: string;
    addressLine1: string; addressLine2: string;
    city: string; state: string; country: string; postalCode: string;
    phone: string; isDefault: boolean;
  }>) {
    if (data.isDefault) {
      await addressRepo.clearDefaults(customerId, storeId);
    }

    const updated = await addressRepo.updateAddress(addressId, customerId, storeId, data);
    if (!updated) throw Object.assign(new Error('Address not found'), { code: ErrorCodes.ADDRESS_NOT_FOUND });
    return updated;
  },

  async deleteAddress(addressId: string, customerId: string, storeId: string) {
    const result = await addressRepo.deleteAddress(addressId, customerId, storeId);
    if (result.length === 0) throw Object.assign(new Error('Address not found'), { code: ErrorCodes.ADDRESS_NOT_FOUND });
    return { deleted: true };
  },

  async setDefaultAddress(addressId: string, customerId: string, storeId: string) {
    // Clear all defaults
    await addressRepo.clearDefaults(customerId, storeId);

    // Set new default
    const updated = await addressRepo.setDefault(addressId, customerId, storeId);
    if (!updated) throw Object.assign(new Error('Address not found'), { code: ErrorCodes.ADDRESS_NOT_FOUND });
    return updated;
  },
};