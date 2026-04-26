import { db } from '../../db/index.js';
import { exchangeRates } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';

export interface ExchangeRateApiResponse {
  base: string;
  rates: Record<string, number>;
}

export const exchangeService = {
  async fetchRates(baseCurrency = 'USD'): Promise<ExchangeRateApiResponse | null> {
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
      if (!response.ok) return null;
      return (await response.json()) as ExchangeRateApiResponse;
    } catch {
      return null;
    }
  },

  async updateRates(baseCurrency = 'USD') {
    const data = await this.fetchRates(baseCurrency);
    if (!data) return { updated: 0 };

    let updated = 0;
    for (const [targetCurrency, rate] of Object.entries(data.rates)) {
      if (targetCurrency === baseCurrency) continue;

      const existing = await db.select().from(exchangeRates)
        .where(and(eq(exchangeRates.baseCurrency, baseCurrency), eq(exchangeRates.targetCurrency, targetCurrency)))
        .limit(1);

      if (existing.length > 0) {
        await db.update(exchangeRates)
          .set({ rate: String(rate), source: 'api', updatedAt: new Date() })
          .where(eq(exchangeRates.id, existing[0].id));
      } else {
        await db.insert(exchangeRates).values({
          baseCurrency,
          targetCurrency,
          rate: String(rate),
          source: 'api',
        });
      }
      updated++;
    }

    return { updated };
  },

  async getRate(baseCurrency: string, targetCurrency: string) {
    const [row] = await db.select().from(exchangeRates)
      .where(and(eq(exchangeRates.baseCurrency, baseCurrency), eq(exchangeRates.targetCurrency, targetCurrency)))
      .limit(1);
    return row ?? null;
  },
};
