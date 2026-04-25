<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Users from '@lucide/svelte/icons/users';
	import Package from '@lucide/svelte/icons/package';
	import Receipt from '@lucide/svelte/icons/receipt';
	import Download from '@lucide/svelte/icons/download';

	let salesRange = $state('30d');
	let salesStart = $state('');
	let salesEnd = $state('');
	let taxRange = $state('30d');
	let taxStart = $state('');
	let taxEnd = $state('');

	function getDateRange(value: string) {
		const end = new Date();
		const start = new Date();
		switch (value) {
			case '7d':
				start.setDate(start.getDate() - 7);
				break;
			case '30d':
				start.setDate(start.getDate() - 30);
				break;
			case '90d':
				start.setDate(start.getDate() - 90);
				break;
			default:
				return null;
		}
		return { start, end };
	}

	function buildUrl(base: string, range: string, start: string, end: string) {
		let url = base;
		if (range === 'custom') {
			if (start && end) {
				const endDate = new Date(end);
				endDate.setHours(23, 59, 59, 999);
				url += `?startDate=${encodeURIComponent(new Date(start).toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`;
			}
		} else {
			const rangeDates = getDateRange(range);
			if (rangeDates) {
				url += `?startDate=${encodeURIComponent(rangeDates.start.toISOString())}&endDate=${encodeURIComponent(rangeDates.end.toISOString())}`;
			}
		}
		return url;
	}

	function exportSales() {
		window.open(buildUrl('/api/v1/merchant/reports/sales', salesRange, salesStart, salesEnd), '_blank');
	}

	function exportCustomers() {
		window.open('/api/v1/merchant/reports/customers', '_blank');
	}

	function exportInventory() {
		window.open('/api/v1/merchant/reports/inventory', '_blank');
	}

	function exportTax() {
		window.open(buildUrl('/api/v1/merchant/reports/tax', taxRange, taxStart, taxEnd), '_blank');
	}
</script>

<svelte:head>
	<title>Reports — StoreDash</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight flex items-center gap-2">
			<FileSpreadsheet class="w-6 h-6 text-primary" />
			Reports
		</h1>
		<p class="text-muted-foreground">Export your store data</p>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<!-- Sales Report -->
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
						<ShoppingCart class="w-4 h-4 text-primary" />
					</div>
					<CardTitle class="text-base">Sales Report</CardTitle>
				</div>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex flex-wrap gap-2">
					<Button
						variant={salesRange === '7d' ? 'default' : 'outline'}
						size="sm"
						onclick={() => (salesRange = '7d')}
					>
						Last 7 days
					</Button>
					<Button
						variant={salesRange === '30d' ? 'default' : 'outline'}
						size="sm"
						onclick={() => (salesRange = '30d')}
					>
						Last 30 days
					</Button>
					<Button
						variant={salesRange === 'custom' ? 'default' : 'outline'}
						size="sm"
						onclick={() => (salesRange = 'custom')}
					>
						Custom
					</Button>
				</div>
				{#if salesRange === 'custom'}
					<div class="grid grid-cols-2 gap-3">
						<div class="space-y-1.5">
							<Label for="sales-start">Start Date</Label>
							<Input id="sales-start" type="date" bind:value={salesStart} />
						</div>
						<div class="space-y-1.5">
							<Label for="sales-end">End Date</Label>
							<Input id="sales-end" type="date" bind:value={salesEnd} />
						</div>
					</div>
				{/if}
				<Button class="w-full" onclick={exportSales}>
					<Download class="w-4 h-4 mr-2" />
					Export CSV
				</Button>
			</CardContent>
		</Card>

		<!-- Customer Report -->
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
						<Users class="w-4 h-4 text-success" />
					</div>
					<CardTitle class="text-base">Customer Report</CardTitle>
				</div>
			</CardHeader>
			<CardContent class="space-y-4">
				<p class="text-sm text-muted-foreground">Export all customers with order history and lifetime value.</p>
				<Button class="w-full" onclick={exportCustomers}>
					<Download class="w-4 h-4 mr-2" />
					Export CSV
				</Button>
			</CardContent>
		</Card>

		<!-- Inventory Report -->
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
						<Package class="w-4 h-4 text-warning" />
					</div>
					<CardTitle class="text-base">Inventory Report</CardTitle>
				</div>
			</CardHeader>
			<CardContent class="space-y-4">
				<p class="text-sm text-muted-foreground">Export all products with stock levels and thresholds.</p>
				<Button class="w-full" onclick={exportInventory}>
					<Download class="w-4 h-4 mr-2" />
					Export CSV
				</Button>
			</CardContent>
		</Card>

		<!-- Tax Report -->
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
						<Receipt class="w-4 h-4 text-info" />
					</div>
					<CardTitle class="text-base">Tax Report</CardTitle>
				</div>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex flex-wrap gap-2">
					<Button
						variant={taxRange === '7d' ? 'default' : 'outline'}
						size="sm"
						onclick={() => (taxRange = '7d')}
					>
						Last 7 days
					</Button>
					<Button
						variant={taxRange === '30d' ? 'default' : 'outline'}
						size="sm"
						onclick={() => (taxRange = '30d')}
					>
						Last 30 days
					</Button>
					<Button
						variant={taxRange === 'custom' ? 'default' : 'outline'}
						size="sm"
						onclick={() => (taxRange = 'custom')}
					>
						Custom
					</Button>
				</div>
				{#if taxRange === 'custom'}
					<div class="grid grid-cols-2 gap-3">
						<div class="space-y-1.5">
							<Label for="tax-start">Start Date</Label>
							<Input id="tax-start" type="date" bind:value={taxStart} />
						</div>
						<div class="space-y-1.5">
							<Label for="tax-end">End Date</Label>
							<Input id="tax-end" type="date" bind:value={taxEnd} />
						</div>
					</div>
				{/if}
				<Button class="w-full" onclick={exportTax}>
					<Download class="w-4 h-4 mr-2" />
					Export CSV
				</Button>
			</CardContent>
		</Card>
	</div>
</div>
