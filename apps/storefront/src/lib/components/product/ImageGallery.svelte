<script lang="ts">
  import { getOptimizedUrl, getSrcset } from '$lib/utils/format.js';

  interface Props {
    images: string[];
    title: string;
  }

  let { images, title }: Props = $props();

  let selectedIndex = $state(0);
  let hoveredIndex = $state(-1);

  let displayIndex = $derived(hoveredIndex >= 0 ? hoveredIndex : selectedIndex);
</script>

<div class="space-y-3">
  <!-- Main image -->
  <div class="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
    {#if images.length > 0}
      <picture class="block w-full h-full">
        <source
          srcset="{getOptimizedUrl(images[displayIndex], 'avif')}"
          type="image/avif"
        />
        <source
          srcset="{getSrcset(images[displayIndex], 'webp')}"
          type="image/webp"
        />
        <img
          src={images[displayIndex]}
          alt={`${title} - Image {displayIndex + 1}`}
          class="w-full h-full object-cover transition-opacity duration-300"
          loading="eager"
          decoding="async"
        />
      </picture>
    {:else}
      <div class="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)]">
        No image
      </div>
    {/if}

    {#if images.length > 1}
      <!-- Navigation arrows -->
      <button
        class="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow hover:bg-white transition-colors"
        onclick={() => (selectedIndex = (selectedIndex - 1 + images.length) % images.length)}
        aria-label="Previous image"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <button
        class="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow hover:bg-white transition-colors"
        onclick={() => (selectedIndex = (selectedIndex + 1) % images.length)}
        aria-label="Next image"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </button>
    {/if}
  </div>

  <!-- Thumbnail strip -->
  {#if images.length > 1}
    <div class="flex gap-2 overflow-x-auto pb-1">
      {#each images as img, i}
        <button
          class="shrink-0 w-16 h-16 rounded-[var(--radius-sm)] overflow-hidden border-2 transition-colors {selectedIndex === i
            ? 'border-[var(--color-primary)]'
            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'}"
          onclick={() => (selectedIndex = i)}
          onmouseenter={() => (hoveredIndex = i)}
          onmouseleave={() => (hoveredIndex = -1)}
          aria-label="View image {i + 1}"
        >
          <picture class="block w-full h-full">
            <source srcset="{getOptimizedUrl(img, 'webp', 320)}" type="image/webp" />
            <img src={img} alt="" class="w-full h-full object-cover" loading="lazy" decoding="async" />
          </picture>
        </button>
      {/each}
    </div>
  {/if}
</div>