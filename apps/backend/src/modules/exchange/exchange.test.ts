// Unit tests for exchangeService — mocked fetch and db
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock db ───
vi.mock('../../db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

import { db } from '../../db/index.js';
import { exchangeService } from './exchange.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// ─── Helpers ───
function setupSelectChain(returnValue: any) {
  const mockLimit = vi.fn().mockResolvedValue(returnValue);
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFromFn = vi.fn().mockReturnValue({ where: mockWhere });
  vi.mocked(db.select).mockReturnValue({ from: mockFromFn } as any);
  return { mockLimit, mockWhere, mockFromFn };
}

function setupUpdateChain() {
  const mockWhere = vi.fn().mockResolvedValue(undefined);
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);
  return { mockSet, mockWhere };
}

function setupInsertChain() {
  const mockValues = vi.fn().mockResolvedValue(undefined);
  vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
  return { mockValues };
}

// ═══════════════════════════════════════════
// fetchRates
// ═══════════════════════════════════════════
describe('exchangeService.fetchRates', () => {
  it('returns parsed JSON on success', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ base: 'USD', rates: { EUR: 0.92 } }),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const result = await exchangeService.fetchRates('USD');

    expect(result).toEqual({ base: 'USD', rates: { EUR: 0.92 } });
    expect(fetch).toHaveBeenCalledWith('https://api.exchangerate-api.com/v4/latest/USD');
  });

  it('returns null when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const result = await exchangeService.fetchRates('USD');
    expect(result).toBeNull();
  });

  it('returns null on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await exchangeService.fetchRates('USD');
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════
// updateRates
// ═══════════════════════════════════════════
describe('exchangeService.updateRates', () => {
  it('updates existing rates and inserts new ones', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        base: 'USD',
        rates: { EUR: 0.92, GBP: 0.79 },
      }),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    // First call: EUR exists, second call: GBP does not exist
    const { mockLimit } = setupSelectChain([]);
    mockLimit.mockResolvedValueOnce([{ id: 'rate-1', baseCurrency: 'USD', targetCurrency: 'EUR', rate: '0.90' }]);
    setupUpdateChain();
    setupInsertChain();

    const result = await exchangeService.updateRates('USD');

    // EUR + GBP = 2 rates updated (USD skipped)
    expect(result.updated).toBe(2);
    expect(db.update).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled();
  });

  it('returns { updated: 0 } when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const result = await exchangeService.updateRates('USD');
    expect(result).toEqual({ updated: 0 });
  });

  it('skips base currency in rates', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        base: 'USD',
        rates: { USD: 1, EUR: 0.92 },
      }),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    setupSelectChain([]);
    setupInsertChain();

    const result = await exchangeService.updateRates('USD');
    expect(result.updated).toBe(1);
  });
});

// ═══════════════════════════════════════════
// getRate
// ═══════════════════════════════════════════
describe('exchangeService.getRate', () => {
  it('returns rate row when found', async () => {
    const row = { id: 'rate-1', baseCurrency: 'USD', targetCurrency: 'EUR', rate: '0.92', source: 'api' };
    setupSelectChain([row]);

    const result = await exchangeService.getRate('USD', 'EUR');
    expect(result).toEqual(row);
  });

  it('returns null when not found', async () => {
    setupSelectChain([]);

    const result = await exchangeService.getRate('USD', 'XYZ');
    expect(result).toBeNull();
  });
});
