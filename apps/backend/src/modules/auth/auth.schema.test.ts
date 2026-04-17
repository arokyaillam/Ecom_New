// Unit tests for Zod validation schemas
// Tests the auth module's request body validation
import { describe, it, expect } from 'vitest';
import { loginSchema, verifyEmailSchema, emailSchema, resetPasswordSchema } from '../_shared/schema.js';
import { registerSchema, merchantRegisterSchema } from './auth.schema.js';

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret123' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret123', extra: 'nope' });
    expect(result.success).toBe(false);
  });
});

describe('emailSchema', () => {
  it('accepts valid email', () => {
    const result = emailSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = emailSchema.safeParse({ email: 'bad' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = emailSchema.safeParse({ email: 'user@example.com', foo: 'bar' });
    expect(result.success).toBe(false);
  });
});

describe('verifyEmailSchema', () => {
  it('accepts non-empty token string', () => {
    const result = verifyEmailSchema.safeParse({ token: 'abc-123-def' });
    expect(result.success).toBe(true);
  });

  it('rejects empty token', () => {
    const result = verifyEmailSchema.safeParse({ token: '' });
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts valid token and strong password', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'reset-token-123',
      password: 'Strong1Pass',
    });
    expect(result.success).toBe(true);
  });

  it('rejects password shorter than 8 chars', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'reset-token-123',
      password: 'Sh1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'reset-token-123',
      password: 'alllowercase1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without digit', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'reset-token-123',
      password: 'NoDigitsHere',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty token', () => {
    const result = resetPasswordSchema.safeParse({
      token: '',
      password: 'Strong1Pass',
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'reset-token-123',
      password: 'Strong1Pass',
      extra: 'nope',
    });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema (customer)', () => {
  it('accepts valid registration with all fields', () => {
    const result = registerSchema.safeParse({
      email: 'customer@store.com',
      password: 'Password1',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
    });
    expect(result.success).toBe(true);
  });

  it('accepts registration with only required fields', () => {
    const result = registerSchema.safeParse({
      email: 'customer@store.com',
      password: 'Password1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'bad-email',
      password: 'Password1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without required complexity', () => {
    const result = registerSchema.safeParse({
      email: 'customer@store.com',
      password: 'alllowercase',
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = registerSchema.safeParse({
      email: 'customer@store.com',
      password: 'Password1',
      unexpected: 'field',
    });
    expect(result.success).toBe(false);
  });
});

describe('merchantRegisterSchema', () => {
  it('accepts valid merchant registration', () => {
    const result = merchantRegisterSchema.safeParse({
      storeName: 'My Store',
      domain: 'mystore',
      ownerEmail: 'owner@store.com',
      ownerName: 'Jane Doe',
      ownerPhone: '+1234567890',
      password: 'Password1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts without optional fields', () => {
    const result = merchantRegisterSchema.safeParse({
      storeName: 'My Store',
      domain: 'mystore',
      ownerEmail: 'owner@store.com',
      password: 'Password1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required storeName', () => {
    const result = merchantRegisterSchema.safeParse({
      domain: 'mystore',
      ownerEmail: 'owner@store.com',
      password: 'Password1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing domain', () => {
    const result = merchantRegisterSchema.safeParse({
      storeName: 'My Store',
      ownerEmail: 'owner@store.com',
      password: 'Password1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects weak password', () => {
    const result = merchantRegisterSchema.safeParse({
      storeName: 'My Store',
      domain: 'mystore',
      ownerEmail: 'owner@store.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = merchantRegisterSchema.safeParse({
      storeName: 'My Store',
      domain: 'mystore',
      ownerEmail: 'not-email',
      password: 'Password1',
    });
    expect(result.success).toBe(false);
  });
});