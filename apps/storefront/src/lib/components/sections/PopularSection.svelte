<script lang="ts">
  import type { Product } from '@repo/shared-types';
  import type { ThemeType } from '@repo/ui/themes';
  import { cn } from '$lib/utils';

  interface Props {
    products: Product[];
    themeType: ThemeType;
    columns?: number;
    showAddToCart?: boolean;
    sectionConfig?: Record<string, unknown>;
  }

  let {
    products,
    themeType,
    columns = 3,
    showAddToCart = true,
    sectionConfig,
  }: Props = $props();

  function formatPrice(price: string): string {
    return `$${parseFloat(price).toFixed(2)}`;
  }

  function productImages(product: Product): string[] {
    if (!product.images) return [];
    return product.images.split(',').map((url) => url.trim()).filter(Boolean);
  }

  function discountedPrice(product: Product): string | null {
    if (!product.discount || product.discount === '0') return null;
    const price = parseFloat(product.salePrice);
    const disc = parseFloat(product.discount);
    if (product.discountType === 'Percent') {
      return (price * (1 - disc / 100)).toFixed(2);
    }
    return Math.max(0, price - disc).toFixed(2);
  }

  const colsClass = $derived(
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 4
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  );
</script>

<section class="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
  <div class="flex items-center justify-between mb-8">
    <h2 class="text-2xl sm:text-3xl font-semibold text-[var(--color-text)]" style="font-family: var(--font-family);">
      Best Sellers
    </h2>
    <a
      href="/products?sort=popular"
      class="text-sm text-[var(--color-primary)] hover:underline font-medium"
    >
      View all &rarr;
    </a>
  </div>

  {#if products.length === 0}
    <p class="text-[var(--color-text-secondary)] text-center py-8">No popular products yet.</p>
  {:else}
    <div class={cn('grid gap-4 sm:gap-6', colsClass)}>
      {#each products as product, rank (product.id)}
        <article
          class="group bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden transition-shadow duration-300 hover:shadow-lg relative"
        >
          <!-- Rank badge -->
          {#if rank < 3}
            <span class="absolute top-2 left-2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-[var(--color-secondary)] text-white text-xs font-bold">
              {rank + 1}
            </span>
          {/if}

          <!-- Image -->
          <div class="relative overflow-hidden" style="aspect-ratio: 1/1;">
            {#if productImages(product)[0]}
              <img
                src={productImages(product)[0]}
                alt={product.titleEn}
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            {:else}
              <div class="h-full w-full bg-[var(--color-border)] flex items-center justify-center">
                <span class="text-[var(--color-text-secondary)] text-sm">No image</span>
              </div>
            {/if}

            {#if product.discount && product.discount !== '0'}
              <span class="absolute top-2 right-2 bg-[var(--color-primary)] text-white text-xs font-semibold px-2 py-0.5 rounded-[var(--radius-md)]">
                {#if product.discountType === 'Percent'}
                  -{parseFloat(product.discount).toFixed(0)}%
                {:else}
                  -{formatPrice(product.discount)}
                {/if}
              </span>
            {/if}
          </div>

          <!-- Info -->
          <div class="p-3 sm:p-4">
            <p class="text-xs text-[var(--color-text-secondary)] mb-1">
              {product.category?.nameEn ?? ''}
            </p>
            <h3 class="text-sm sm:text-base font-medium text-[var(--color-text)] line-clamp-2 mb-2">
              {product.titleEn}
            </h3>
            <div class="flex items-center gap-2">
              {#if discountedPrice(product)}
                <span class="text-[var(--color-primary)] font-bold text-sm">
                  ${discountedPrice(product)}
                </span>
                <span class="text-[var(--color-text-secondary)] line-through text-xs">
                  {formatPrice(product.salePrice)}
                </span>
              {:else}
                <span class="text-[var(--color-text)] font-bold text-sm">
                  {formatPrice(product.salePrice)}
                </span>
              {/if}
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>