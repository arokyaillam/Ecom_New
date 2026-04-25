<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { LineChart, FunnelChart } from '$lib/components/charts';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Users from '@lucide/svelte/icons/users';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';

	let { data } = $props();

	const rangeOptions = [
		{ label: 'Last 7 days', value: '7d' },
		{ label: 'Last 30 days', value: '30d' },
		{ label: 'Last 90 days', value: '90d' },
		{ label: 'This year', value: 'year' },
	];

	const currentRange = $derived(data.range || '30d');

	function setRange(value: string) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('range', value);
		goto(`/dashboard/analytics?${params}`);
	}

	function formatPrice(p: string | number) {
		return `$${Number(p || 0).toFixed(2)}`;
	}

	function formatShortDate(period: string) {
		// daily: YYYY-MM-DD, weekly: IYYY-IW, monthly: YYYY-MM
		if (period.includes('-') && period.length === 10) {
			const d = new Date(period);
			return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		}
		if (period.includes('-') && period.length === 7) {
			const [year, month] = period.split('-');
			return `${month}/${year}`;
		}
		return period;
	}

	const revenueData = $derived(
		data.revenue.map((r: { period: string; revenue: string }) => ({
			label: formatShortDate(r.period),
			value: Number(r.revenue),
		}))
	);

	const ordersData = $derived(
		data.orders.map((o: { period: string; orderCount: number }) => ({
			label: formatShortDate(o.period),
			value: Number(o.orderCount),
		}))
	);

	const totalRevenue = $derived(
		data.revenue.reduce((sum: number, r: { revenue: string }) => sum + Number(r.revenue), 0)
	);

	const totalOrders = $derived(
		data.orders.reduce((sum: number, o: { orderCount: number }) => sum + Number(o.orderCount), 0)
	);

	const currentRetention = $derived(
		data.retention.length > 0 ? data.retention[data.retention.length - 1] : null
	);

	const funnelData = $derived(data.funnel || []);

	const bestSellers = $derived(data.bestSellers || []);
</script>

<svelte:head>
	<title>Analytics — StoreDash</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight flex items-center gap-2">
				<BarChart3 class="w-6 h-6 text-primary" />
				Analytics
			</h1>
			<p class="text-muted-foreground">Track your store performance</p>
		</div>

		<div class="flex items-center gap-2">
			{#each rangeOptions as opt}
				<Button
					variant={currentRange === opt.value ? 'default' : 'outline'}
					size="sm"
					onclick={() => setRange(opt.value)}
				>
					{opt.label}
				</Button>
			{/each}
		</div>
	</div>

	<!-- Summary Cards -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Revenue</CardTitle>
				<DollarSign class="w-4 h-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
				<p class="text-xs text-muted-foreground mt-1">In selected period</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Orders</CardTitle>
				<ShoppingCart class="w-4 h-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
				<p class="text-xs text-muted-foreground mt-1">In selected period</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Retention Rate</CardTitle>
				<Users class="w-4 h-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">
					{currentRetention ? `${currentRetention.retentionRate}%` : '—'}
				</div>
				<p class="text-xs text-muted-foreground mt-1">
					{#if currentRetention}
						{currentRetention.returningCustomers} of {currentRetention.totalCustomers} returning
					{:else}
						No data
					{/if}
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Avg Order Value</CardTitle>
				<TrendingUp class="w-4 h-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">
					{totalOrders > 0 ? formatPrice(totalRevenue / totalOrders) : '—'}
				</div>
				<p class="text-xs text-muted-foreground mt-1">In selected period</p>
			</CardContent>
		</Card>
	</div>

	<!-- Charts Row -->
	<div class="grid gap-4 md:grid-cols-2">
		<Card>
			<CardHeader>
				<CardTitle>Revenue Over Time</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="h-[240px] w-full">
					<LineChart data={revenueData} color="#0ea5e9" />
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Order Trends</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="h-[240px] w-full">
					<LineChart data={ordersData} color="#8b5cf6" />
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Best Sellers + Funnel Row -->
	<div class="grid gap-4 md:grid-cols-2">
		<Card>
			<CardHeader>
				<CardTitle>Best Sellers</CardTitle>
			</CardHeader>
			<CardContent>
				{#if bestSellers.length === 0}
					<p class="text-muted-foreground text-center py-8">No sales data for this period</p>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Product</Table.Head>
								<Table.Head class="text-right">Units</Table.Head>
								<Table.Head class="text-right">Revenue</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each bestSellers as seller, i}
								<Table.Row>
									<Table.Cell>
										<div class="flex items-center gap-2">
											<span class="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
												{i + 1}
											</span>
											<span class="truncate max-w-[200px]">{seller.productTitle}</span>
										</div>
									</Table.Cell>
									<Table.Cell class="text-right">{seller.totalQuantity}</Table.Cell>
									<Table.Cell class="text-right font-medium">{formatPrice(seller.totalRevenue)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Conversion Funnel</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="h-[240px] w-full">
					<FunnelChart stages={funnelData} />
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Retention History -->
	{#if data.retention.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>Customer Retention History</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{#each data.retention.slice(-4) as r}
						<div class="p-4 rounded-lg border bg-card">
							<div class="text-sm text-muted-foreground mb-1">Period {r.period}</div>
							<div class="text-2xl font-bold">{r.retentionRate}%</div>
							<div class="text-xs text-muted-foreground mt-1">
								{r.returningCustomers} returning of {r.totalCustomers} total
							</div>
							<div class="w-full h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
								<div
									class="h-full bg-primary rounded-full transition-all"
									style="width: {Math.min(r.retentionRate, 100)}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
