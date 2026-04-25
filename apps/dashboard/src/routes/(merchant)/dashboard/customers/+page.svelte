<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { hasPermission } from '$lib/permissions';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Search from '@lucide/svelte/icons/search';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Users from '@lucide/svelte/icons/users';
	import Star from '@lucide/svelte/icons/star';
	import Ban from '@lucide/svelte/icons/ban';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';

	let { data } = $props();

	let searchValue = $state(data.search || '');
	let blockingId = $state<string | null>(null);

	const customers = $derived(data.customers?.data || []);
	const total = $derived(data.customers?.pagination?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(data.customers?.pagination?.totalPages || 1);
	const canWrite = $derived(hasPermission(data.userPermissions, 'customers:write'));

	function doSearch() {
		const params = new URLSearchParams(page.url.searchParams);
		if (searchValue) params.set('search', searchValue);
		else params.delete('search');
		params.set('page', '1');
		goto(`/dashboard/customers?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/dashboard/customers?${params}`);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatPrice(p: string | number) {
		return `$${Number(p).toFixed(2)}`;
	}

	async function blockCustomer(id: string, reason?: string) {
		blockingId = id;
		try {
			await apiFetch(`/merchant/customers/${id}/block`, {
				method: 'POST',
				body: JSON.stringify({ reason }),
			});
			toast.success('Customer blocked');
			invalidateAll();
		} catch {
			toast.error('Failed to block customer');
		} finally {
			blockingId = null;
		}
	}

	async function unblockCustomer(id: string) {
		blockingId = id;
		try {
			await apiFetch(`/merchant/customers/${id}/unblock`, { method: 'POST' });
			toast.success('Customer unblocked');
			invalidateAll();
		} catch {
			toast.error('Failed to unblock customer');
		} finally {
			blockingId = null;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Customers</h1>
		<p class="text-muted-foreground">View and manage your customer base</p>
	</div>

	<Card>
		<CardContent class="p-4">
			<form onsubmit={(e) => { e.preventDefault(); doSearch(); }} class="flex gap-3">
				<div class="relative flex-1">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input bind:value={searchValue} placeholder="Search by name or email..." class="pl-10" />
				</div>
				<Button type="submit" variant="secondary">Search</Button>
			</form>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="text-base">{total} customer{total !== 1 ? 's' : ''}</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if customers.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<Users class="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p class="text-lg font-medium">No customers found</p>
					<p class="text-sm mt-1">Customers will appear here after they register.</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Name</Table.Head>
							<Table.Head>Email</Table.Head>
							<Table.Head>Phone</Table.Head>
							<Table.Head class="text-right">LTV</Table.Head>
							<Table.Head class="text-center">Orders</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head>Joined</Table.Head>
							{#if canWrite}
								<Table.Head class="text-right">Actions</Table.Head>
							{/if}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each customers as customer (customer.id)}
							<Table.Row class="hover:bg-muted/50">
								<Table.Cell class="font-medium">
									<button class="text-left" onclick={() => goto(`/dashboard/customers/${customer.id}`)}>
										{customer.firstName || ''} {customer.lastName || ''}
										{#if !customer.firstName && !customer.lastName}
											<span class="text-muted-foreground">—</span>
										{/if}
									</button>
									{#if customer.orderCount > 1}
										<Star class="inline w-3.5 h-3.5 text-amber-500 ml-1" />
									{/if}
								</Table.Cell>
								<Table.Cell>
									<button class="text-left" onclick={() => goto(`/dashboard/customers/${customer.id}`)}>
										{customer.email}
									</button>
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">{customer.phone || '—'}</Table.Cell>
								<Table.Cell class="text-right font-medium">{formatPrice(customer.ltv || 0)}</Table.Cell>
								<Table.Cell class="text-center">{customer.orderCount || 0}</Table.Cell>
								<Table.Cell class="text-center">
									{#if customer.isBlocked}
										<Badge class="bg-destructive/15 text-destructive border-destructive/30">
											<Ban class="w-3 h-3 mr-1" />
											Blocked
										</Badge>
									{:else if customer.isVerified}
										<Badge class="bg-success/15 text-success border-success/30">
											<ShieldCheck class="w-3 h-3 mr-1" />
											Active
										</Badge>
									{:else}
										<Badge variant="secondary">Unverified</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">{formatDate(customer.createdAt)}</Table.Cell>
								{#if canWrite}
									<Table.Cell class="text-right">
										{#if customer.isBlocked}
											<Button
												variant="outline"
												size="sm"
												disabled={blockingId === customer.id}
												onclick={() => unblockCustomer(customer.id)}
											>
												Unblock
											</Button>
										{:else}
											<Button
												variant="outline"
												size="sm"
												disabled={blockingId === customer.id}
												onclick={(e) => {
													e.stopPropagation();
													const reason = window.prompt('Block reason (optional):');
													if (reason !== null) blockCustomer(customer.id, reason || undefined);
												}}
											>
												Block
											</Button>
										{/if}
									</Table.Cell>
								{/if}
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
