<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import Search from '@lucide/svelte/icons/search';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CreditCard from '@lucide/svelte/icons/credit-card';

	let { data } = $props();

	let searchValue = $state(data.search || '');

	const payments = $derived(data.payments?.items || []);
	const total = $derived(data.payments?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));

	const statuses = ['', 'pending', 'completed', 'failed', 'refunded'];
	const statusColors: Record<string, string> = {
		pending: 'bg-warning/15 text-warning border-warning/30',
		completed: 'bg-success/15 text-success border-success/30',
		failed: 'bg-destructive/15 text-destructive border-destructive/30',
		refunded: 'bg-info/15 text-info border-info/30',
	};

	function filterByStatus(s: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (s) params.set('status', s);
		else params.delete('status');
		params.set('page', '1');
		goto(`/dashboard/payments?${params}`);
	}

	function doSearch() {
		const params = new URLSearchParams(page.url.searchParams);
		if (searchValue) params.set('search', searchValue);
		else params.delete('search');
		params.set('page', '1');
		goto(`/dashboard/payments?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/dashboard/payments?${params}`);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatPrice(p: string | number, currency?: string) {
		const symbol = currency === 'INR' ? '₹' : '$';
		return `${symbol}${Number(p).toFixed(2)}`;
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Payments</h1>
		<p class="text-muted-foreground">Manage payment status, refunds, and disputes</p>
	</div>

	<!-- Status Filters -->
	<div class="flex flex-wrap gap-2">
		{#each statuses as s}
			<Button
				variant={data.status === s ? 'default' : 'outline'}
				size="sm"
				onclick={() => filterByStatus(s)}
			>
				{s || 'All'}
			</Button>
		{/each}
	</div>

	<!-- Search -->
	<Card>
		<CardContent class="p-4">
			<form onsubmit={(e) => { e.preventDefault(); doSearch(); }} class="flex gap-3">
				<div class="relative flex-1">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input bind:value={searchValue} placeholder="Search by transaction ID..." class="pl-10" />
				</div>
				<Button type="submit" variant="secondary">Search</Button>
			</form>
		</CardContent>
	</Card>

	<!-- Payments Table -->
	<Card>
		<CardHeader>
			<CardTitle class="text-base">{total} payment{total !== 1 ? 's' : ''}</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if payments.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<CreditCard class="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p class="text-lg font-medium">No payments found</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Order #</Table.Head>
							<Table.Head>Provider</Table.Head>
							<Table.Head class="text-right">Amount</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head>Date</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each payments as payment (payment.id)}
							<Table.Row class="cursor-pointer hover:bg-muted/50" onclick={() => goto(`/dashboard/payments/${payment.id}`)}>
								<Table.Cell class="font-medium">
									#{payment.order?.orderNumber || payment.orderId}
								</Table.Cell>
								<Table.Cell class="capitalize text-muted-foreground">{payment.provider}</Table.Cell>
								<Table.Cell class="text-right font-medium">{formatPrice(payment.amount, payment.currency)}</Table.Cell>
								<Table.Cell class="text-center">
									<Badge class={statusColors[payment.status] || ''}>
										{payment.status}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">{formatDate(payment.createdAt)}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>

				{#if totalPages > 1}
					<Separator />
					<div class="flex items-center justify-between p-4">
						<p class="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
						<div class="flex gap-1">
							<Button variant="outline" size="sm" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>
								<ChevronLeft class="w-4 h-4" />
							</Button>
							<Button variant="outline" size="sm" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)}>
								<ChevronRight class="w-4 h-4" />
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</CardContent>
	</Card>
</div>
