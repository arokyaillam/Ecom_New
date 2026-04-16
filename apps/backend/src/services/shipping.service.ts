// Shipping Service - Zone and rate CRUD, shipping calculation
import { db } from '../db/index.js';
import { shippingZones, shippingRates } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { ErrorCodes } from '../errors/codes.js';

export const shippingService = {
  // ─── Zone CRUD ───

  async createZone(storeId: string, data: { name: string; countries?: string[]; states?: string[]; postalCodePatterns?: string[]; isActive?: boolean }) {
    const [zone] = await db.insert(shippingZones).values({
      storeId,
      name: data.name,
      countries: data.countries || [],
      states: data.states || [],
      postalCodePatterns: data.postalCodePatterns || [],
      isActive: data.isActive ?? true,
    }).returning();
    return zone;
  },

  async listZones(storeId: string) {
    return db.query.shippingZones.findMany({
      where: eq(shippingZones.storeId, storeId),
      with: { rates: true },
    });
  },

  async getZone(zoneId: string, storeId: string) {
    return db.query.shippingZones.findFirst({
      where: and(eq(shippingZones.id, zoneId), eq(shippingZones.storeId, storeId)),
      with: { rates: true },
    });
  },

  async updateZone(zoneId: string, storeId: string, data: Partial<{ name: string; countries: string[]; states: string[]; postalCodePatterns: string[]; isActive: boolean }>) {
    const [updated] = await db.update(shippingZones)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(shippingZones.id, zoneId), eq(shippingZones.storeId, storeId)))
      .returning();
    if (!updated) throw Object.assign(new Error('Zone not found'), { code: ErrorCodes.ZONE_NOT_FOUND });
    return updated;
  },

  async deleteZone(zoneId: string, storeId: string) {
    const result = await db.delete(shippingZones)
      .where(and(eq(shippingZones.id, zoneId), eq(shippingZones.storeId, storeId)))
      .returning();
    if (result.length === 0) throw Object.assign(new Error('Zone not found'), { code: ErrorCodes.ZONE_NOT_FOUND });
    return { deleted: true };
  },

  // ─── Rate CRUD ───

  async createRate(storeId: string, data: { zoneId: string; name: string; method: string; carrier?: string; price: string; freeAbove?: string; weightBased?: boolean; pricePerKg?: string; estimatedDays?: number; isActive?: boolean }) {
    // Verify zone belongs to store
    const zone = await db.query.shippingZones.findFirst({
      where: and(eq(shippingZones.id, data.zoneId), eq(shippingZones.storeId, storeId)),
    });
    if (!zone) throw Object.assign(new Error('Zone not found'), { code: ErrorCodes.ZONE_NOT_FOUND });

    const [rate] = await db.insert(shippingRates).values({
      storeId,
      zoneId: data.zoneId,
      name: data.name,
      method: data.method,
      carrier: data.carrier,
      price: data.price,
      freeAbove: data.freeAbove,
      weightBased: data.weightBased ?? false,
      pricePerKg: data.pricePerKg,
      estimatedDays: data.estimatedDays,
      isActive: data.isActive ?? true,
    }).returning();
    return rate;
  },

  async listRates(zoneId: string, storeId: string) {
    // Verify zone belongs to store
    const zone = await db.query.shippingZones.findFirst({
      where: and(eq(shippingZones.id, zoneId), eq(shippingZones.storeId, storeId)),
    });
    if (!zone) throw Object.assign(new Error('Zone not found'), { code: ErrorCodes.ZONE_NOT_FOUND });

    return db.query.shippingRates.findMany({
      where: and(eq(shippingRates.zoneId, zoneId), eq(shippingRates.storeId, storeId)),
    });
  },

  async getRate(rateId: string, storeId: string) {
    return db.query.shippingRates.findFirst({
      where: and(eq(shippingRates.id, rateId), eq(shippingRates.storeId, storeId)),
    });
  },

  async updateRate(rateId: string, storeId: string, data: Partial<{ name: string; method: string; carrier: string; price: string; freeAbove: string; weightBased: boolean; pricePerKg: string; estimatedDays: number; isActive: boolean }>) {
    const [updated] = await db.update(shippingRates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(shippingRates.id, rateId), eq(shippingRates.storeId, storeId)))
      .returning();
    if (!updated) throw Object.assign(new Error('Rate not found'), { code: ErrorCodes.RATE_NOT_FOUND });
    return updated;
  },

  async deleteRate(rateId: string, storeId: string) {
    const result = await db.delete(shippingRates)
      .where(and(eq(shippingRates.id, rateId), eq(shippingRates.storeId, storeId)))
      .returning();
    if (result.length === 0) throw Object.assign(new Error('Rate not found'), { code: ErrorCodes.RATE_NOT_FOUND });
    return { deleted: true };
  },

  // ─── Calculate Shipping ───

  async calculateShipping(storeId: string, address: { country: string; state?: string; postalCode?: string }, subtotal: string, weightKg?: number) {
    // Find matching zones for this address
    const zones = await db.query.shippingZones.findMany({
      where: and(eq(shippingZones.storeId, storeId), eq(shippingZones.isActive, true)),
      with: { rates: { where: eq(shippingRates.isActive, true) } },
    });

    const matchingZones = zones.filter((zone) => {
      const countries = zone.countries || [];
      const states = zone.states || [];
      const patterns = zone.postalCodePatterns || [];

      // Empty arrays = matches all
      if (countries.length === 0 && states.length === 0 && patterns.length === 0) return true;

      if (countries.length > 0 && !countries.includes(address.country)) return false;
      if (states.length > 0 && address.state && !states.includes(address.state)) return false;
      if (patterns.length > 0 && address.postalCode) {
        const matchesPattern = patterns.some((p) => {
          // Simple wildcard matching: "12*" matches "12345"
          const regex = new RegExp('^' + p.replace(/\*/g, '.*') + '$');
          return regex.test(address.postalCode!);
        });
        if (!matchesPattern) return false;
      }

      return true;
    });

    if (matchingZones.length === 0) {
      return { options: [], message: 'No shipping available for this address' };
    }

    // Collect all active rates from matching zones, applying freeAbove logic
    const options: Array<{ id: string; name: string; method: string; carrier: string | null; price: string; estimatedDays: number | null; free: boolean }> = [];

    for (const zone of matchingZones) {
      for (const rate of zone.rates) {
        let price = rate.price;
        let isFree = false;

        // Check free shipping threshold
        if (rate.freeAbove && Number(subtotal) >= Number(rate.freeAbove)) {
          price = '0';
          isFree = true;
        }

        // Weight-based pricing
        if (rate.weightBased && rate.pricePerKg && weightKg && weightKg > 0) {
          const basePrice = Number(rate.price);
          const weightPrice = Number(rate.pricePerKg) * weightKg;
          price = (basePrice + weightPrice).toFixed(2);
          if (isFree) price = '0';
        }

        options.push({
          id: rate.id,
          name: rate.name,
          method: rate.method,
          carrier: rate.carrier,
          price,
          estimatedDays: rate.estimatedDays,
          free: isFree,
        });
      }
    }

    return { options };
  },
};