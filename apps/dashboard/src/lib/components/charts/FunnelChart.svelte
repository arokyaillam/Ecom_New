<script lang="ts">
	interface FunnelStage {
		stage: string;
		count: number;
		percentage: number;
	}

	interface Props {
		stages: FunnelStage[];
		height?: number;
	}

	let { stages, height = 240 }: Props = $props();

	const stageLabels: Record<string, string> = {
		visits: 'Store Visits',
		addToCart: 'Add to Cart',
		checkoutStarted: 'Checkout Started',
		paid: 'Paid Orders',
	};

	const maxCount = $derived(Math.max(...stages.map((s) => s.count), 1));
</script>

{#if stages.length === 0}
	<div class="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>
{:else}
	<div class="w-full" style="height: {height}px;">
		<div class="flex items-end justify-center gap-2 h-full px-4">
			{#each stages as stage, i}
				{@const barWidthPercent = (stage.count / maxCount) * 100}
				{@const opacity = 1 - i * 0.18}
				<div class="flex flex-col items-center flex-1 gap-2">
					<div class="text-xs font-medium text-foreground">{stage.count.toLocaleString()}</div>
					<div class="text-[10px] text-muted-foreground">
						{#if i > 0}
							{stage.percentage.toFixed(1)}%
						{:else}
							100%
						{/if}
					</div>
					<div
						class="w-full rounded-t-md bg-primary transition-all"
						style="height: {Math.max(barWidthPercent, 8)}%; opacity: {opacity}; min-height: 24px;"
					></div>
					<div class="text-[10px] text-muted-foreground text-center leading-tight">
						{stageLabels[stage.stage] || stage.stage}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
