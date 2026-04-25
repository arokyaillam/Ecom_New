<script lang="ts">
	interface DataPoint {
		label: string;
		value: number;
	}

	interface Props {
		data: DataPoint[];
		color?: string;
		fill?: boolean;
		height?: number;
	}

	let { data, color = '#0ea5e9', fill = true, height = 200 }: Props = $props();

	const padding = { top: 10, right: 10, bottom: 30, left: 40 };
	const chartWidth = 600;

	const innerWidth = chartWidth - padding.left - padding.right;
	const innerHeight = $derived(height - padding.top - padding.bottom);

	const maxValue = $derived(Math.max(...data.map((d) => d.value), 1));

	function xScale(index: number) {
		return padding.left + (index / Math.max(data.length - 1, 1)) * innerWidth;
	}

	function yScale(value: number) {
		return padding.top + innerHeight - (value / maxValue) * innerHeight;
	}

	const pathD = $derived(() => {
		if (data.length === 0) return '';
		const points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`);
		return `M ${points.join(' L ')}`;
	});

	const areaD = $derived(() => {
		if (data.length === 0) return '';
		const points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`);
		const bottomY = padding.top + innerHeight;
		return `M ${points[0]} L ${points.join(' L ')} L ${xScale(data.length - 1)},${bottomY} L ${xScale(0)},${bottomY} Z`;
	});

	const yTicks = $derived(() => {
		const ticks = 5;
		return Array.from({ length: ticks + 1 }, (_, i) => (maxValue / ticks) * i);
	});

	function formatLabel(label: string, index: number, total: number) {
		// Show fewer labels if there are many data points
		if (total > 14 && index % Math.ceil(total / 7) !== 0) return '';
		return label;
	}
</script>

{#if data.length === 0}
	<div class="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>
{:else}
	<svg viewBox="0 0 {chartWidth} {height}" class="w-full h-full" preserveAspectRatio="none">
		<!-- Grid lines -->
		{#each yTicks() as tick}
			<line
				x1={padding.left}
				y1={yScale(tick)}
				x2={padding.left + innerWidth}
				y2={yScale(tick)}
				stroke="currentColor"
				stroke-opacity="0.1"
				stroke-dasharray="4"
			/>
			<text
				x={padding.left - 8}
				y={yScale(tick)}
				text-anchor="end"
				dominant-baseline="middle"
				class="text-[10px] fill-muted-foreground"
				style="font-size: 10px;"
			>
				{Math.round(tick)}
			</text>
		{/each}

		<!-- Area fill -->
		{#if fill}
			<path d={areaD()} fill={color} opacity="0.15" />
		{/if}

		<!-- Line -->
		<path
			d={pathD()}
			fill="none"
			stroke={color}
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>

		<!-- Data points -->
		{#each data as d, i}
			<circle
				cx={xScale(i)}
				cy={yScale(d.value)}
				r="3"
				fill={color}
				stroke="white"
				stroke-width="1.5"
			/>
		{/each}

		<!-- X axis labels -->
		{#each data as d, i}
			{@const label = formatLabel(d.label, i, data.length)}
			{#if label}
				<text
					x={xScale(i)}
					y={height - 4}
					text-anchor="middle"
					class="text-[10px] fill-muted-foreground"
					style="font-size: 10px;"
				>
					{label}
				</text>
			{/if}
		{/each}
	</svg>
{/if}
