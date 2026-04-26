/**
 * Format a decimal-string price for display.
 * Prices from the backend are always strings (decimal columns) — never assume numbers.
 */
export function formatPrice(price: string | number, currency = '$'): string {
	const num = typeof price === 'string' ? parseFloat(price) : price;
	if (Number.isNaN(num)) return `${currency}0.00`;
	return `${currency}${num.toFixed(2)}`;
}

/**
 * Parse the `images` field into an array of URLs.
 * The backend stores images as a JSON array of strings.
 * For backwards compatibility, also accepts comma-separated strings.
 */
export function parseImages(images: string | string[] | null | undefined): string[] {
	if (!images) return [];
	if (Array.isArray(images)) return images.filter(Boolean);
	return images
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

/**
 * Parse the `tags` field into an array of strings.
 * The backend stores tags as a JSON array of strings.
 * For backwards compatibility, also accepts comma-separated strings.
 */
export function parseTags(tags: string | string[] | null | undefined): string[] {
	if (!tags) return [];
	if (Array.isArray(tags)) return tags.filter(Boolean);
	return tags
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

/**
 * Compute the final price after applying a discount.
 * `discountType` is "Percent" or "Fixed" (matches backend enum).
 * Returns a number so callers can format it themselves.
 */
export function calcDiscountedPrice(
	salePrice: string,
	discountType: string,
	discount: string
): number {
	const price = parseFloat(salePrice);
	const disc = parseFloat(discount);
	if (Number.isNaN(price) || Number.isNaN(disc) || disc <= 0) return price;
	if (discountType === 'Percent') return price * (1 - disc / 100);
	return Math.max(0, price - disc);
}

/**
 * Build a human-readable discount label like "-20%" or "-$5.00".
 */
export function discountLabel(discountType: string, discount: string): string {
	const disc = parseFloat(discount);
	if (Number.isNaN(disc) || disc <= 0) return '';
	if (discountType === 'Percent') return `-${disc}%`;
	return `-${formatPrice(disc)}`;
}

/**
 * Build an optimized image URL by replacing the extension with format/size suffix.
 * Example: https://cdn.example.com/image.jpg -> https://cdn.example.com/image-1024w.webp
 */
export function getOptimizedUrl(originalUrl: string, format: 'webp' | 'avif', size = 1024): string {
	return originalUrl.replace(/\.[^.]+$/, `-${size}w.${format}`);
}

/**
 * Build a srcset string for responsive images.
 */
export function getSrcset(originalUrl: string, format: 'webp' | 'avif'): string {
	const sizes = [320, 640, 1024, 1920];
	return sizes.map((w) => `${getOptimizedUrl(originalUrl, format, w)} ${w}w`).join(', ');
}