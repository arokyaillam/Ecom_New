// Unit tests for Store Zod schemas
// Tests request body validation for store update and store listing endpoints
import { describe, it, expect } from 'vitest';
import {
  updateStoreSchema,
  storeListQuerySchema,
  merchantUpdateStoreSchema,
  hexColor,
  cssRadius,
  cssFontStack,
  cssRgbaColor,
  idParamSchema,
} from './store.schema.js';

// ═══════════════════════════════════════════
// updateStoreSchema (super-admin)
// ═══════════════════════════════════════════
describe('updateStoreSchema', () => {
  it('accepts empty partial update', () => {
    const result = updateStoreSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid status update', () => {
    for (const status of ['pending', 'active', 'suspended'] as const) {
      const result = updateStoreSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('accepts planId with valid UUID', () => {
    const result = updateStoreSchema.safeParse({ planId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });

  it('accepts planId as null (to clear)', () => {
    const result = updateStoreSchema.safeParse({ planId: null });
    expect(result.success).toBe(true);
  });

  it('accepts planExpiresAt as valid datetime', () => {
    const result = updateStoreSchema.safeParse({ planExpiresAt: '2025-12-31T23:59:59Z' });
    expect(result.success).toBe(true);
  });

  it('accepts planExpiresAt as null', () => {
    const result = updateStoreSchema.safeParse({ planExpiresAt: null });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status value', () => {
    const result = updateStoreSchema.safeParse({ status: 'deleted' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid planId format', () => {
    const result = updateStoreSchema.safeParse({ planId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid datetime format for planExpiresAt', () => {
    const result = updateStoreSchema.safeParse({ planExpiresAt: 'not-a-date' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = updateStoreSchema.safeParse({ status: 'active', extraField: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// storeListQuerySchema
// ═══════════════════════════════════════════
describe('storeListQuerySchema', () => {
  it('applies default values', () => {
    const result = storeListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('coerces string page and limit to numbers', () => {
    const result = storeListQuerySchema.safeParse({ page: '3', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it('accepts valid status filter', () => {
    for (const status of ['pending', 'active', 'suspended'] as const) {
      const result = storeListQuerySchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('accepts query without status filter', () => {
    const result = storeListQuerySchema.safeParse({ page: 1, limit: 10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBeUndefined();
    }
  });

  it('rejects invalid status value', () => {
    const result = storeListQuerySchema.safeParse({ status: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects page below 1', () => {
    const result = storeListQuerySchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit below 1', () => {
    const result = storeListQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit above 100', () => {
    const result = storeListQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('accepts limit at boundary value 100', () => {
    const result = storeListQuerySchema.safeParse({ limit: 100 });
    expect(result.success).toBe(true);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = storeListQuerySchema.safeParse({ page: 1, extra: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// CSS / theme validation helpers
// ═══════════════════════════════════════════
describe('hexColor', () => {
  it('accepts 3-digit hex color', () => {
    const result = hexColor.safeParse('#fff');
    expect(result.success).toBe(true);
  });

  it('accepts 6-digit hex color', () => {
    const result = hexColor.safeParse('#0ea5e9');
    expect(result.success).toBe(true);
  });

  it('accepts mixed case hex color', () => {
    const result = hexColor.safeParse('#AbC123');
    expect(result.success).toBe(true);
  });

  it('rejects color without hash', () => {
    const result = hexColor.safeParse('fff');
    expect(result.success).toBe(false);
  });

  it('rejects 4-digit hex color', () => {
    const result = hexColor.safeParse('#abcd');
    expect(result.success).toBe(false);
  });

  it('rejects 8-digit hex color', () => {
    const result = hexColor.safeParse('#12345678');
    expect(result.success).toBe(false);
  });

  it('rejects invalid hex characters', () => {
    const result = hexColor.safeParse('#ggg');
    expect(result.success).toBe(false);
  });
});

describe('cssRadius', () => {
  it('accepts valid radius like 12px', () => {
    const result = cssRadius.safeParse('12px');
    expect(result.success).toBe(true);
  });

  it('accepts single digit radius', () => {
    const result = cssRadius.safeParse('8px');
    expect(result.success).toBe(true);
  });

  it('accepts 4-digit radius', () => {
    const result = cssRadius.safeParse('9999px');
    expect(result.success).toBe(true);
  });

  it('rejects radius without px unit', () => {
    const result = cssRadius.safeParse('12');
    expect(result.success).toBe(false);
  });

  it('rejects radius with decimal', () => {
    const result = cssRadius.safeParse('12.5px');
    expect(result.success).toBe(false);
  });

  it('rejects 5-digit radius', () => {
    const result = cssRadius.safeParse('12345px');
    expect(result.success).toBe(false);
  });
});

describe('cssFontStack', () => {
  it('accepts simple font name', () => {
    const result = cssFontStack.safeParse('Inter');
    expect(result.success).toBe(true);
  });

  it('accepts font stack with commas', () => {
    const result = cssFontStack.safeParse('Inter, Arial, sans-serif');
    expect(result.success).toBe(true);
  });

  it('accepts quoted font names', () => {
    const result = cssFontStack.safeParse("'Times New Roman', serif");
    expect(result.success).toBe(true);
  });

  it('rejects font stack over 200 chars', () => {
    const result = cssFontStack.safeParse('a'.repeat(201));
    expect(result.success).toBe(false);
  });

  it('rejects font stack with special characters (JS injection)', () => {
    const result = cssFontStack.safeParse('Arial; background:url(evil)');
    expect(result.success).toBe(false);
  });
});

describe('cssRgbaColor', () => {
  it('accepts hex color (3-digit)', () => {
    const result = cssRgbaColor.safeParse('#fff');
    expect(result.success).toBe(true);
  });

  it('accepts hex color (6-digit)', () => {
    const result = cssRgbaColor.safeParse('#0ea5e9');
    expect(result.success).toBe(true);
  });

  it('accepts valid rgba color', () => {
    const result = cssRgbaColor.safeParse('rgba(14, 165, 233, 0.5)');
    expect(result.success).toBe(true);
  });

  it('accepts rgba with 0 alpha', () => {
    const result = cssRgbaColor.safeParse('rgba(0, 0, 0, 0.0)');
    expect(result.success).toBe(true);
  });

  it('accepts rgba with 1 alpha', () => {
    const result = cssRgbaColor.safeParse('rgba(255, 255, 255, 1.0)');
    expect(result.success).toBe(true);
  });

  it('rejects invalid rgba (missing alpha)', () => {
    const result = cssRgbaColor.safeParse('rgba(14, 165, 233)');
    expect(result.success).toBe(false);
  });

  it('rejects plain rgb', () => {
    const result = cssRgbaColor.safeParse('rgb(14, 165, 233)');
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// merchantUpdateStoreSchema
// ═══════════════════════════════════════════
describe('merchantUpdateStoreSchema', () => {
  it('accepts empty partial update', () => {
    const result = merchantUpdateStoreSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts name update', () => {
    const result = merchantUpdateStoreSchema.safeParse({ name: 'My Store' });
    expect(result.success).toBe(true);
  });

  it('accepts domain update', () => {
    const result = merchantUpdateStoreSchema.safeParse({ domain: 'mystore' });
    expect(result.success).toBe(true);
  });

  it('accepts valid hex color fields', () => {
    const result = merchantUpdateStoreSchema.safeParse({
      primaryColor: '#0ea5e9',
      secondaryColor: '#fff',
      accentColor: '#ff5500',
      backgroundColor: '#f5f5f5',
      surfaceColor: '#ffffff',
      textColor: '#333333',
      textSecondaryColor: '#999',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid borderColor (hex or rgba)', () => {
    const hexResult = merchantUpdateStoreSchema.safeParse({ borderColor: '#ccc' });
    expect(hexResult.success).toBe(true);

    const rgbaResult = merchantUpdateStoreSchema.safeParse({ borderColor: 'rgba(0, 0, 0, 0.1)' });
    expect(rgbaResult.success).toBe(true);
  });

  it('accepts valid borderRadius', () => {
    const result = merchantUpdateStoreSchema.safeParse({ borderRadius: '12px' });
    expect(result.success).toBe(true);
  });

  it('accepts valid fontFamily', () => {
    const result = merchantUpdateStoreSchema.safeParse({ fontFamily: 'Inter, sans-serif' });
    expect(result.success).toBe(true);
  });

  it('accepts valid URLs for logoUrl and faviconUrl', () => {
    const result = merchantUpdateStoreSchema.safeParse({
      logoUrl: 'https://example.com/logo.png',
      faviconUrl: 'https://example.com/favicon.ico',
    });
    expect(result.success).toBe(true);
  });

  it('accepts hero fields', () => {
    const result = merchantUpdateStoreSchema.safeParse({
      heroImage: 'https://example.com/hero.jpg',
      heroTitle: 'Welcome',
      heroSubtitle: 'Shop now',
      heroCtaText: 'Browse',
      heroCtaLink: '/products',
      heroEnabled: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts currency and language', () => {
    const result = merchantUpdateStoreSchema.safeParse({ currency: 'SAR', language: 'ar' });
    expect(result.success).toBe(true);
  });

  it('accepts activeTheme (max 50 chars)', () => {
    const result = merchantUpdateStoreSchema.safeParse({ activeTheme: 'modern' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = merchantUpdateStoreSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name over 255 chars', () => {
    const result = merchantUpdateStoreSchema.safeParse({ name: 'a'.repeat(256) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid hex color for primaryColor', () => {
    const result = merchantUpdateStoreSchema.safeParse({ primaryColor: 'red' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid borderRadius format', () => {
    const result = merchantUpdateStoreSchema.safeParse({ borderRadius: '12em' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid URL for logoUrl', () => {
    const result = merchantUpdateStoreSchema.safeParse({ logoUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects activeTheme over 50 chars', () => {
    const result = merchantUpdateStoreSchema.safeParse({ activeTheme: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('rejects currency over 3 chars', () => {
    const result = merchantUpdateStoreSchema.safeParse({ currency: 'USDD' });
    expect(result.success).toBe(false);
  });

  it('rejects language over 5 chars', () => {
    const result = merchantUpdateStoreSchema.safeParse({ language: 'en-US-extra' });
    expect(result.success).toBe(false);
  });

  it('rejects heroTitle over 255 chars', () => {
    const result = merchantUpdateStoreSchema.safeParse({ heroTitle: 'a'.repeat(256) });
    expect(result.success).toBe(false);
  });

  it('rejects heroSubtitle over 500 chars', () => {
    const result = merchantUpdateStoreSchema.safeParse({ heroSubtitle: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects heroCtaText over 100 chars', () => {
    const result = merchantUpdateStoreSchema.safeParse({ heroCtaText: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects heroCtaLink over 500 chars', () => {
    const result = merchantUpdateStoreSchema.safeParse({ heroCtaLink: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid fontFamily (JS injection)', () => {
    const result = merchantUpdateStoreSchema.safeParse({ fontFamily: 'Arial; background:url(evil)' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid borderColor (plain rgb)', () => {
    const result = merchantUpdateStoreSchema.safeParse({ borderColor: 'rgb(0,0,0)' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = merchantUpdateStoreSchema.safeParse({ name: 'My Store', extraField: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// idParamSchema (re-exported from shared)
// ═══════════════════════════════════════════
describe('idParamSchema (store)', () => {
  it('accepts valid UUID', () => {
    const result = idParamSchema.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = idParamSchema.safeParse({ id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});