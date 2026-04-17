// Unit tests for decimal.ts — pure function money arithmetic
// No mocks needed, these are pure functions with string I/O
import { describe, it, expect } from 'vitest';
import {
  addDecimals,
  subtractDecimals,
  multiplyDecimalByInt,
  decimalsEqual,
  isPositive,
  minDecimal,
} from '../lib/decimal.js';

describe('addDecimals', () => {
  it('adds two positive decimals', () => {
    expect(addDecimals('10.50', '5.25')).toBe('15.75');
  });

  it('adds zero values', () => {
    expect(addDecimals('0.00', '0.00')).toBe('0.00');
  });

  it('adds whole numbers without decimals', () => {
    expect(addDecimals('10', '5')).toBe('15.00');
  });

  it('adds small fractional amounts', () => {
    expect(addDecimals('0.99', '0.01')).toBe('1.00');
  });

  it('handles three-digit results', () => {
    expect(addDecimals('99.99', '0.02')).toBe('100.01');
  });

  it('adds large values', () => {
    expect(addDecimals('999999.99', '0.01')).toBe('1000000.00');
  });

  it('adds values with different decimal precision', () => {
    expect(addDecimals('10.5', '5.25')).toBe('15.75');
  });

  it('adds value with no decimal part', () => {
    expect(addDecimals('100', '25.50')).toBe('125.50');
  });
});

describe('subtractDecimals', () => {
  it('subtracts two decimals', () => {
    expect(subtractDecimals('10.50', '5.25')).toBe('5.25');
  });

  it('subtracts to zero', () => {
    expect(subtractDecimals('5.00', '5.00')).toBe('0.00');
  });

  it('produces negative results', () => {
    expect(subtractDecimals('3.00', '5.00')).toBe('-2.00');
  });

  it('subtracts small fractional amounts', () => {
    expect(subtractDecimals('1.00', '0.01')).toBe('0.99');
  });

  it('subtracts from zero', () => {
    expect(subtractDecimals('0.00', '10.00')).toBe('-10.00');
  });
});

describe('multiplyDecimalByInt', () => {
  it('multiplies by 1 returns same value', () => {
    expect(multiplyDecimalByInt('12.99', 1)).toBe('12.99');
  });

  it('multiplies by 2 doubles the value', () => {
    expect(multiplyDecimalByInt('12.99', 2)).toBe('25.98');
  });

  it('multiplies by 0 returns zero', () => {
    expect(multiplyDecimalByInt('99.99', 0)).toBe('0.00');
  });

  it('multiplies by large quantity', () => {
    expect(multiplyDecimalByInt('0.99', 100)).toBe('99.00');
  });

  it('handles whole number prices', () => {
    expect(multiplyDecimalByInt('10.00', 3)).toBe('30.00');
  });

  it('rounds correctly for repeating decimals', () => {
    // 0.01 * 3 = 0.03
    expect(multiplyDecimalByInt('0.01', 3)).toBe('0.03');
  });

  it('handles typical e-commerce line totals', () => {
    // $499.99 x 3 = $1499.97
    expect(multiplyDecimalByInt('499.99', 3)).toBe('1499.97');
  });
});

describe('decimalsEqual', () => {
  it('returns true for equal values', () => {
    expect(decimalsEqual('10.50', '10.50')).toBe(true);
  });

  it('returns false for different values', () => {
    expect(decimalsEqual('10.50', '10.51')).toBe(false);
  });

  it('normalizes precision for comparison', () => {
    expect(decimalsEqual('10.5', '10.50')).toBe(true);
  });

  it('compares zero values', () => {
    expect(decimalsEqual('0.00', '0.00')).toBe(true);
  });

  it('compares different sign values', () => {
    expect(decimalsEqual('5.00', '-5.00')).toBe(false);
  });
});

describe('isPositive', () => {
  it('returns true for positive value', () => {
    expect(isPositive('0.01')).toBe(true);
  });

  it('returns false for zero', () => {
    expect(isPositive('0.00')).toBe(false);
  });

  it('returns false for negative value', () => {
    expect(isPositive('-1.00')).toBe(false);
  });

  it('returns true for large positive value', () => {
    expect(isPositive('999999.99')).toBe(true);
  });
});

describe('minDecimal', () => {
  it('returns smaller of two values', () => {
    expect(minDecimal('5.00', '10.00')).toBe('5.00');
  });

  it('returns second value when smaller', () => {
    expect(minDecimal('10.00', '5.00')).toBe('5.00');
  });

  it('returns either when equal', () => {
    expect(minDecimal('5.00', '5.00')).toBe('5.00');
  });

  it('handles negative vs positive', () => {
    expect(minDecimal('-1.00', '1.00')).toBe('-1.00');
  });
});