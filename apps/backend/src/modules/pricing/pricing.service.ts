// Pricing service — server-side price computation for checkout and cart.
// Calls pricingRepo for DB lookups and delegates coupon/shipping/tax to their services.
// NEVER imports from db/index.js directly.
import { ErrorCodes } from '../../errors/codes.js';
import { addDecimals, subtractDecimals, multiplyDecimalByInt, minDecimal } from '../../lib/decimal.js';
import { couponService } from '../coupon/coupon.service.js';
import { shippingService } from '../shipping/shipping.service.js';
import { taxService } from '../tax/tax.service.js';
import { pricingRepo } from './pricing.repo.js';

export interface ComputeItemPriceParams {
  storeId: string;
  productId: string;
  variantOptionIds?: string[];
  combinationKey?: string;
  modifierOptionIds?: string[];
  quantity: number;
}

export interface ComputedItemPrice {
  productId: string;
  productTitle: string;
  productImage: string | null;
  variantName: string | null;
  salePrice: string;
  variantAdjustment: string;
  modifierAdjustment: string;
  discountType: string | null;
  discountAmount: string;
  effectivePrice: string;
  lineTotal: string;
  currentQuantity: number;
  isPublished: boolean;
  quantityRequested: number;
}

export interface ComputeOrderPricingParams {
  storeId: string;
  items: Array<{
    productId: string;
    quantity: number;
    variantOptionIds?: string[];
    combinationKey?: string;
    modifierOptionIds?: string[];
  }>;
  couponCode?: string;
  customerId?: string;
  shippingAddress: {
    country: string;
    state?: string;
    postalCode?: string;
  };
  shippingRateId?: string;
}

export interface ComputedOrderPricing {
  items: ComputedItemPrice[];
  subtotal: string;
  discount: string;
  subtotalAfterDiscount: string;
  shipping: string;
  shippingOptionId: string | null;
  tax: string;
  taxBreakdown: Array<{ name: string; rate: string; amount: number }>;
  total: string;
  coupon: typeof import('../../db/schema.js').coupons.$inferSelect | null;
  freeShipping: boolean;
}

export const pricingService = {
  /**
   * Compute the authoritative price for a single order line item.
   * Looks up product, variant options, combination, and modifier adjustments via pricingRepo.
   */
  async computeItemPrice(params: ComputeItemPriceParams): Promise<ComputedItemPrice> {
    const { storeId, productId, variantOptionIds, combinationKey, modifierOptionIds, quantity } = params;

    // 1. Fetch product
    const product = await pricingRepo.findProductById(productId, storeId);

    if (!product) {
      throw Object.assign(new Error('Product not found'), { code: ErrorCodes.PRODUCT_NOT_FOUND });
    }

    if (!product.isPublished) {
      throw Object.assign(new Error('Product is not available for purchase'), { code: ErrorCodes.PRODUCT_UNPUBLISHED });
    }

    if ((product.currentQuantity ?? 0) < quantity) {
      throw Object.assign(new Error('Insufficient inventory'), { code: ErrorCodes.INSUFFICIENT_INVENTORY });
    }

    let effectivePrice = product.salePrice;
    let variantAdjustment = '0.00';
    let modifierAdjustment = '0.00';
    let variantName: string | null = null;

    // 2. Resolve variant option price adjustments
    if (variantOptionIds && variantOptionIds.length > 0) {
      const options = await pricingRepo.findVariantOptionsByIds(variantOptionIds, storeId);

      if (options.length !== variantOptionIds.length) {
        throw Object.assign(new Error('One or more variant options not found'), { code: ErrorCodes.VARIANT_NOT_FOUND });
      }

      // Verify each option belongs to a variant of this product
      const optionVariantIds = [...new Set(options.map((o) => o.variantId))];
      const variants = await pricingRepo.findVariantsByIds(optionVariantIds, productId);

      if (variants.length !== optionVariantIds.length) {
        throw Object.assign(new Error('Variant options do not belong to this product'), { code: ErrorCodes.VARIANT_NOT_FOUND });
      }

      // Check availability and sum adjustments
      for (const option of options) {
        if (!option.isAvailable) {
          throw Object.assign(new Error('Variant option is not available'), { code: ErrorCodes.PRODUCT_UNAVAILABLE });
        }
        variantAdjustment = addDecimals(variantAdjustment, option.priceAdjustment ?? '0');
      }

      // Build variant name from option names
      variantName = options.map((o) => o.nameEn).join(' / ');
      effectivePrice = addDecimals(effectivePrice, variantAdjustment);
    }

    // 3. Resolve combination price adjustment (overrides individual variant adjustments)
    if (combinationKey) {
      const combination = await pricingRepo.findCombination(combinationKey, productId, storeId);

      if (!combination) {
        throw Object.assign(new Error('Variant combination not found'), { code: ErrorCodes.VARIANT_NOT_FOUND });
      }

      if (!combination.isAvailable) {
        throw Object.assign(new Error('Variant combination is not available'), { code: ErrorCodes.PRODUCT_UNAVAILABLE });
      }

      // If variant options were also provided, we already added their adjustments.
      // The combination's priceAdjustment is additive on top of the product base price,
      // NOT additive on top of individual option adjustments.
      // So if both are provided, we need to subtract the option adjustments and add the combination adjustment.
      if (variantOptionIds && variantOptionIds.length > 0) {
        // Undo the option adjustments we already added
        effectivePrice = subtractDecimals(effectivePrice, variantAdjustment);
        variantAdjustment = '0.00';
      }
      // Apply combination adjustment
      variantAdjustment = addDecimals(variantAdjustment, combination.priceAdjustment ?? '0');
      effectivePrice = addDecimals(product.salePrice, variantAdjustment);

      // Check combination stock if set
      if (combination.stockQuantity !== null && combination.stockQuantity < quantity) {
        throw Object.assign(new Error('Insufficient inventory for this variant combination'), { code: ErrorCodes.INSUFFICIENT_INVENTORY });
      }
    }

    // 4. Resolve modifier option price adjustments
    if (modifierOptionIds && modifierOptionIds.length > 0) {
      const modifierOpts = await pricingRepo.findModifierOptionsByIds(modifierOptionIds, storeId);

      if (modifierOpts.length !== modifierOptionIds.length) {
        throw Object.assign(new Error('One or more modifier options not found'), { code: ErrorCodes.MODIFIER_NOT_FOUND });
      }

      // Verify each modifier option belongs to a group that applies to this product
      const groupIds = [...new Set(modifierOpts.map((o) => o.modifierGroupId))];
      const groups = await pricingRepo.findModifierGroupsByIds(groupIds, storeId);

      for (const group of groups) {
        const belongsToProduct = group.productId === productId;
        // Category-level modifier groups are also valid but we only check product-level for now
        if (!belongsToProduct && group.productId !== null) {
          throw Object.assign(new Error('Modifier option does not belong to this product'), { code: ErrorCodes.MODIFIER_NOT_FOUND });
        }
      }

      for (const opt of modifierOpts) {
        if (!opt.isAvailable) {
          throw Object.assign(new Error('Modifier option is not available'), { code: ErrorCodes.PRODUCT_UNAVAILABLE });
        }
        modifierAdjustment = addDecimals(modifierAdjustment, opt.priceAdjustment ?? '0');
      }

      effectivePrice = addDecimals(effectivePrice, modifierAdjustment);
    }

    // 5. Apply product-level discount
    let discountAmount = '0.00';
    if (product.discount && product.discount !== '0' && product.discountType) {
      if (product.discountType === 'Percent') {
        // Percentage discount: effectivePrice * discount / 100
        const priceCents = Math.round(parseFloat(effectivePrice) * 100);
        const percentage = parseFloat(product.discount);
        let discountCents = Math.round((priceCents * percentage) / 100);
        discountAmount = (discountCents / 100).toFixed(2);
        // Cap discount at the effective price
        if (parseFloat(discountAmount) > parseFloat(effectivePrice)) {
          discountAmount = effectivePrice;
        }
        effectivePrice = subtractDecimals(effectivePrice, discountAmount);
      } else if (product.discountType === 'Fixed') {
        // Fixed discount: subtract the amount, cap at effective price
        discountAmount = minDecimal(product.discount, effectivePrice);
        effectivePrice = subtractDecimals(effectivePrice, discountAmount);
      }
    }

    // Ensure effective price is never negative
    if (parseFloat(effectivePrice) < 0) {
      effectivePrice = '0.00';
    }

    // 6. Compute line total
    const lineTotal = multiplyDecimalByInt(effectivePrice, quantity);

    return {
      productId: product.id,
      productTitle: product.titleEn,
      productImage: product.images ? product.images.split(',')[0]?.trim() || null : null,
      variantName,
      salePrice: product.salePrice,
      variantAdjustment,
      modifierAdjustment,
      discountType: product.discountType,
      discountAmount,
      effectivePrice,
      lineTotal,
      currentQuantity: product.currentQuantity ?? 0,
      isPublished: product.isPublished ?? true,
      quantityRequested: quantity,
    };
  },

  /**
   * Compute the full order pricing including items, coupon, shipping, and tax.
   */
  async computeOrderPricing(params: ComputeOrderPricingParams): Promise<ComputedOrderPricing> {
    const { storeId, items, couponCode, shippingAddress, shippingRateId } = params;

    // 1. Compute each item's price
    const computedItems: ComputedItemPrice[] = [];
    for (const item of items) {
      const itemPrice = await this.computeItemPrice({
        storeId,
        productId: item.productId,
        variantOptionIds: item.variantOptionIds,
        combinationKey: item.combinationKey,
        modifierOptionIds: item.modifierOptionIds,
        quantity: item.quantity,
      });
      computedItems.push(itemPrice);
    }

    // 2. Compute subtotal
    let subtotal = '0.00';
    for (const item of computedItems) {
      subtotal = addDecimals(subtotal, item.lineTotal);
    }

    // 3. Apply coupon if provided (delegates to couponService — cross-module service call)
    let discount = '0.00';
    let freeShipping = false;
    let coupon: typeof import('../../db/schema.js').coupons.$inferSelect | null = null;

    if (couponCode) {
      coupon = await couponService.validateCoupon(couponCode, storeId, subtotal);
      const productIds = computedItems.map((item) => item.productId);
      const discountResult = await couponService.calculateDiscount(coupon, subtotal, productIds);
      discount = discountResult.discountAmount;
      freeShipping = discountResult.freeShipping;
    }

    const subtotalAfterDiscount = parseFloat(subtotal) >= parseFloat(discount)
      ? subtractDecimals(subtotal, discount)
      : '0.00';

    // 4. Calculate shipping (delegates to shippingService — cross-module service call)
    let shipping = '0.00';
    let shippingOptionId: string | null = null;

    if (shippingRateId && shippingAddress.country) {
      const shippingResult = await shippingService.calculateShipping(
        storeId,
        shippingAddress,
        subtotalAfterDiscount,
      );

      if (shippingResult.options.length > 0) {
        const selectedOption = shippingResult.options.find((opt: { id: string }) => opt.id === shippingRateId);

        if (!selectedOption) {
          throw Object.assign(new Error('Selected shipping option is not available'), {
            code: ErrorCodes.SHIPPING_OPTION_INVALID,
          });
        }

        shipping = freeShipping ? '0.00' : selectedOption.price;
        shippingOptionId = selectedOption.id;
      }
    }

    // 5. Calculate tax (delegates to taxService — cross-module service call)
    let tax = 0;
    let taxBreakdown: Array<{ name: string; rate: string; amount: number }> = [];

    if (shippingAddress.country) {
      const taxResult = await taxService.calculateTax(
        storeId,
        shippingAddress,
        subtotalAfterDiscount,
        shipping,
      );
      tax = taxResult.totalTax;
      taxBreakdown = taxResult.breakdown;
    }

    const taxString = tax.toFixed(2);

    // 6. Compute total
    const total = addDecimals(addDecimals(subtotalAfterDiscount, shipping), taxString);

    return {
      items: computedItems,
      subtotal,
      discount,
      subtotalAfterDiscount,
      shipping,
      shippingOptionId,
      tax: taxString,
      taxBreakdown,
      total,
      coupon,
      freeShipping,
    };
  },
};