// Unit tests for Order Zod schemas
// Tests request body validation for order listing and status update endpoints
import { describe, it, expect } from 'vitest';
import { merchantListQuerySchema, updateStatusSchema, idParamSchema } from './order.schema.js';

// ═══════════════════════════════════════════
// merchantListQuerySchema
// ═══════════════════════════════════════════
describe('merchantListQuerySchema', () => {
  it('applies default values', () => {
    const result = merchantListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('coerces string page and limit to numbers', () => {
    const result = merchantListQuerySchema.safeParse({ page: '3', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it('accepts valid status filter', () => {
    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
    for (const status of statuses) {
      const result = merchantListQuerySchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('accepts query without status filter', () => {
    const result = merchantListQuerySchema.safeParse({ page: 1, limit: 10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBeUndefined();
    }
  });

  it('rejects invalid status value', () => {
    const result = merchantListQuerySchema.safeParse({ status: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects page below 1', () => {
    const result = merchantListQuerySchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit below 1', () => {
    const result = merchantListQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit above 100', () => {
    const result = merchantListQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('accepts limit at boundary value 1', () => {
    const result = merchantListQuerySchema.safeParse({ limit: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts limit at boundary value 100', () => {
    const result = merchantListQuerySchema.safeParse({ limit: 100 });
    expect(result.success).toBe(true);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = merchantListQuerySchema.safeParse({ page: 1, extra: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// updateStatusSchema
// ═══════════════════════════════════════════
describe('updateStatusSchema', () => {
  it('accepts pending status', () => {
    const result = updateStatusSchema.safeParse({ status: 'pending' });
    expect(result.success).toBe(true);
  });

  it('accepts processing status', () => {
    const result = updateStatusSchema.safeParse({ status: 'processing' });
    expect(result.success).toBe(true);
  });

  it('accepts shipped status', () => {
    const result = updateStatusSchema.safeParse({ status: 'shipped' });
    expect(result.success).toBe(true);
  });

  it('accepts delivered status', () => {
    const result = updateStatusSchema.safeParse({ status: 'delivered' });
    expect(result.success).toBe(true);
  });

  it('accepts cancelled status', () => {
    const result = updateStatusSchema.safeParse({ status: 'cancelled' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status value', () => {
    const result = updateStatusSchema.safeParse({ status: 'returned' });
    expect(result.success).toBe(false);
  });

  it('rejects missing status field', () => {
    const result = updateStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = updateStatusSchema.safeParse({ status: 'pending', extra: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// idParamSchema (re-exported from shared)
// ═══════════════════════════════════════════
describe('idParamSchema (order)', () => {
  it('accepts valid UUID', () => {
    const result = idParamSchema.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = idParamSchema.safeParse({ id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});