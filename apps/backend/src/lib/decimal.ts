/**
 * Convert a decimal string to integer cents.
 * "10.50" -> 1050, "10" -> 1000, "0.99" -> 99
 */
export function toCents(value: string): number {
  const parts = value.split('.');
  const whole = parts[0] || '0';
  const fractional = (parts[1] || '').padEnd(2, '0').slice(0, 2);
  return Math.round(Number(whole) * 100 + Number(fractional));
}

/**
 * Convert integer cents back to a decimal string with 2 decimal places.
 * 1050 -> "10.50", 1000 -> "10.00", 99 -> "0.99"
 */
export function fromCents(cents: number): string {
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const whole = Math.floor(absCents / 100);
  const frac = absCents % 100;
  const sign = isNegative ? '-' : '';
  return `${sign}${whole}.${frac.toString().padStart(2, '0')}`;
}

/**
 * Add two decimal strings.
 * addDecimals("10.50", "5.25") -> "15.75"
 */
export function addDecimals(a: string, b: string): string {
  return fromCents(toCents(a) + toCents(b));
}

/**
 * Subtract two decimal strings (a - b).
 * subtractDecimals("10.50", "5.25") -> "5.25"
 */
export function subtractDecimals(a: string, b: string): string {
  return fromCents(toCents(a) - toCents(b));
}

/**
 * Multiply a decimal string by an integer.
 * multiplyDecimalByInt("12.99", 3) -> "38.97"
 */
export function multiplyDecimalByInt(decimal: string, quantity: number): string {
  return fromCents(Math.round(toCents(decimal) * quantity));
}

/**
 * Divide a decimal string by an integer.
 * divideDecimalByInt("10.50", 2) -> "5.25"
 */
export function divideDecimalByInt(decimal: string, divisor: number): string {
  if (divisor === 0) throw new Error('Division by zero');
  return fromCents(Math.round(toCents(decimal) / divisor));
}

/**
 * Compare two decimal strings for equality (normalized to 2dp).
 * decimalsEqual("10.50", "10.50") -> true
 * decimalsEqual("10.50", "10.51") -> false
 */
export function decimalsEqual(a: string, b: string): boolean {
  return toCents(a) === toCents(b);
}

/**
 * Check if a decimal string is greater than zero.
 * isPositive("0.01") -> true
 * isPositive("0.00") -> false
 * isPositive("-1.00") -> false
 */
export function isPositive(value: string): boolean {
  return toCents(value) > 0;
}

/**
 * Get the minimum of two decimal strings.
 * minDecimal("5.00", "10.00") -> "5.00"
 */
export function minDecimal(a: string, b: string): string {
  return toCents(a) <= toCents(b) ? a : b;
}