// Product types
import type { products, productVariants, productVariantOptions } from '../../db/schema.js';

export type ProductInsert = typeof products.$inferInsert;
export type ProductUpdate = Partial<ProductInsert>;
export type VariantInsert = typeof productVariants.$inferInsert;
export type VariantUpdate = Partial<VariantInsert>;
export type VariantOptionInsert = typeof productVariantOptions.$inferInsert;
export type VariantOptionUpdate = Partial<VariantOptionInsert>;

export type ProductSearchParams = {
  q?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  isPublished?: boolean;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'name_asc' | 'name_desc';
  limit?: number;
  offset?: number;
};