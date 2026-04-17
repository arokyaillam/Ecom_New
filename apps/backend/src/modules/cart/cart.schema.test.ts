// Unit tests for Cart Zod schemas
// Tests request body validation for cart add, update, and item ID param endpoints
import { describe, it, expect } from 'vitest';
import { addItemSchema, updateItemSchema, itemIdParamSchema } from './cart.schema.js';

// ═══════════════════════════════════════════
// addItemSchema
// ═══════════════════════════════════════════
describe('addItemSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = addItemSchema.safeParse({
      productId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(1);
    }
  });

  it('accepts valid input with all optional fields', () => {
    const result = addItemSchema.safeParse({
      productId: '550e8400-e29b-41d4-a716-446655440000',
      quantity: 3,
      variantOptionIds: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
      combinationKey: 'red-large',
      modifierOptionIds: ['550e8400-e29b-41d4-a716-446655440003'],
    });
    expect(result.success).toBe(true);
  });

  it('defaults quantity to 1 when omitted', () => {
    const result = addItemSchema.safeParse({
      productId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(1);
    }
  });

  it('rejects missing productId', () => {
    const result = addItemSchema.safeParse({ quantity: 2 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid productId (not UUID)', () => {
    const result = addItemSchema.safeParse({ productId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects quantity below 1', () => {
    const result = addItemSchema.safeParse({
      productId: '550e8400-e29b-41d4-a716-446655440000',
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative quantity', () => {
    const result = addItemSchema.safeParse({
      productId: '550e8400-e29b-41d4-a716-446655440000',
      quantity: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer quantity', () => {
    const result = addItemSchema.safeParse({
      productId: '550e8400-e29b-41d4-a716-446655440000',
      quantity: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid variantOptionIds (non-UUID)', () => {
    const result = addItemSchema.safeParse({
      productId: '550e8400-e29b-41d4-a716-446655440000',
      variantOptionIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid modifierOptionIds (non-UUID)', () => {
    const result = addItemSchema.safeParse({
      productId: '550e8400-e29b-41d4-a716-446655440000',
      modifierOptionIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = addItemSchema.safeParse({
      productId: '550e8400-e29b-41d4-a716-446655440000',
      extraField: 'nope',
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// updateItemSchema
// ═══════════════════════════════════════════
describe('updateItemSchema', () => {
  it('accepts valid quantity', () => {
    const result = updateItemSchema.safeParse({ quantity: 5 });
    expect(result.success).toBe(true);
  });

  it('accepts quantity of 1 (minimum valid)', () => {
    const result = updateItemSchema.safeParse({ quantity: 1 });
    expect(result.success).toBe(true);
  });

  it('rejects quantity of 0', () => {
    const result = updateItemSchema.safeParse({ quantity: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative quantity', () => {
    const result = updateItemSchema.safeParse({ quantity: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer quantity', () => {
    const result = updateItemSchema.safeParse({ quantity: 2.5 });
    expect(result.success).toBe(false);
  });

  it('rejects missing quantity field', () => {
    const result = updateItemSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = updateItemSchema.safeParse({ quantity: 3, extraField: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// itemIdParamSchema
// ═══════════════════════════════════════════
describe('itemIdParamSchema', () => {
  it('accepts valid UUID', () => {
    const result = itemIdParamSchema.safeParse({ itemId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = itemIdParamSchema.safeParse({ itemId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing itemId', () => {
    const result = itemIdParamSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = itemIdParamSchema.safeParse({
      itemId: '550e8400-e29b-41d4-a716-446655440000',
      extraField: 'nope',
    });
    expect(result.success).toBe(false);
  });
});