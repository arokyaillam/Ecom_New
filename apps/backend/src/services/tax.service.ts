// Tax Service - Tax rate CRUD and calculation
import { db } from '../db/index.js';
import { taxRates } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { ErrorCodes } from '../errors/codes.js';

export const taxService = {
  // ─── CRUD ───

  async createRate(storeId: string, data: { name: string; rate: string; country?: string; state?: string; postalCode?: string; isCompound?: boolean; priority?: number; isActive?: boolean }) {
    const [rate] = await db.insert(taxRates).values({
      storeId,
      name: data.name,
      rate: data.rate,
      country: data.country,
      state: data.state,
      postalCode: data.postalCode,
      isCompound: data.isCompound ?? false,
      priority: data.priority ?? 1,
      isActive: data.isActive ?? true,
    }).returning();
    return rate;
  },

  async listRates(storeId: string) {
    return db.query.taxRates.findMany({
      where: eq(taxRates.storeId, storeId),
      orderBy: (rates, { asc }) => [asc(rates.priority)],
    });
  },

  async getRate(rateId: string, storeId: string) {
    return db.query.taxRates.findFirst({
      where: and(eq(taxRates.id, rateId), eq(taxRates.storeId, storeId)),
    });
  },

  async updateRate(rateId: string, storeId: string, data: Partial<{ name: string; rate: string; country: string; state: string; postalCode: string; isCompound: boolean; priority: number; isActive: boolean }>) {
    const [updated] = await db.update(taxRates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(taxRates.id, rateId), eq(taxRates.storeId, storeId)))
      .returning();
    if (!updated) throw Object.assign(new Error('Tax rate not found'), { code: ErrorCodes.TAX_RATE_NOT_FOUND });
    return updated;
  },

  async deleteRate(rateId: string, storeId: string) {
    const result = await db.delete(taxRates)
      .where(and(eq(taxRates.id, rateId), eq(taxRates.storeId, storeId)))
      .returning();
    if (result.length === 0) throw Object.assign(new Error('Tax rate not found'), { code: ErrorCodes.TAX_RATE_NOT_FOUND });
    return { deleted: true };
  },

  // ─── Calculate Tax ───

  async calculateTax(storeId: string, address: { country: string; state?: string; postalCode?: string }, subtotal: string, shipping: string) {
    // Find all active tax rates for this store, ordered by priority
    const allRates = await db.query.taxRates.findMany({
      where: and(eq(taxRates.storeId, storeId), eq(taxRates.isActive, true)),
      orderBy: (rates, { asc }) => [asc(rates.priority)],
    });

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