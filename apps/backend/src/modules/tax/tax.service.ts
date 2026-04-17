// Tax Service - Tax rate CRUD and calculation
import { ErrorCodes } from '../../errors/codes.js';
import * as repo from './tax.repo.js';

export const taxService = {
  // ─── CRUD ───

  async createRate(
    storeId: string,
    data: {
      name: string;
      rate: string;
      country?: string;
      state?: string;
      postalCode?: string;
      isCompound?: boolean;
      priority?: number;
      isActive?: boolean;
    },
  ) {
    return repo.insertRate(storeId, data);
  },

  async listRates(storeId: string) {
    return repo.findRatesByStoreId(storeId);
  },

  async getRate(rateId: string, storeId: string) {
    return repo.findRateById(rateId, storeId);
  },

  async updateRate(
    rateId: string,
    storeId: string,
    data: Partial<{
      name: string;
      rate: string;
      country: string;
      state: string;
      postalCode: string;
      isCompound: boolean;
      priority: number;
      isActive: boolean;
    }>,
  ) {
    const updated = await repo.updateRate(rateId, storeId, data);
    if (!updated)
      throw Object.assign(new Error('Tax rate not found'), {
        code: ErrorCodes.TAX_RATE_NOT_FOUND,
      });
    return updated;
  },

  async deleteRate(rateId: string, storeId: string) {
    const result = await repo.deleteRateById(rateId, storeId);
    if (result.length === 0)
      throw Object.assign(new Error('Tax rate not found'), {
        code: ErrorCodes.TAX_RATE_NOT_FOUND,
      });
    return { deleted: true };
  },

  // ─── Calculate Tax ───

  async calculateTax(
    storeId: string,
    address: { country: string; state?: string; postalCode?: string },
    subtotal: string,
    shipping: string,
  ) {
    // Find all active tax rates for this store, ordered by priority
    const allRates = await repo.findActiveRatesByStoreId(storeId);

    // Filter rates that match the address
    const matchingRates = allRates.filter((rate) => {
      // Null country = applies to all countries
      if (!rate.country) return true;
      if (rate.country !== address.country) return false;
      // Null state = applies to all states within the country
      if (rate.state && rate.state !== address.state) return false;
      // Null postalCode = applies to all postal codes
      if (rate.postalCode && rate.postalCode !== address.postalCode) return false;
      return true;
    });

    // Apply rates in priority order, handling compound taxes
    let taxableAmount = Number(subtotal) + Number(shipping);
    let totalTax = 0;
    const breakdown: Array<{ name: string; rate: string; amount: number }> = [];
    let lastPriority = 0;

    for (const rate of matchingRates) {
      // Compound: apply on top of previous taxes at same or lower priority
      if (rate.isCompound && rate.priority !== lastPriority) {
        taxableAmount += totalTax;
        lastPriority = rate.priority ?? 1;
      } else if (!rate.isCompound) {
        lastPriority = rate.priority ?? 1;
      }

      const taxAmount = taxableAmount * Number(rate.rate);
      totalTax += taxAmount;
      breakdown.push({
        name: rate.name,
        rate: rate.rate,
        amount: Math.round(taxAmount * 100) / 100,
      });
    }

    return {
      totalTax: Math.round(totalTax * 100) / 100,
      breakdown,
    };
  },
};