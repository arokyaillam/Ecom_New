<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { Separator } from '$lib/components/ui/separator';
	import Store from '@lucide/svelte/icons/store';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let { data } = $props();

	const stores = $derived(data.stores?.stores || []);
	const total = $derived(data.stores?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));

	const statusColors: Record<string, string> = {
		pending: 'bg-warning/15 text-warning border-warning/30',
		active: 'bg-success/15 text-success border-success/30',
		suspended: 'bg-destructive/15 text-destructive border-destructive/30',
	};

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/admin/stores?${params}`);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">All Stores</h1>
		<p class="text-muted-foreground">Platform-wide store overview</p>
	</div>

	<Card>
		<CardHeader>
			<CardTitle class="text-base">{total} store{total !== 1 ? 's' : ''}</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if stores.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<Store class="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p class="text-lg font-medium">No stores found</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Store</Table.Head>
							<Table.Head>Domain</Table.Head>
							<Table.Head>Owner</Table.Head>
							<Table.Head>Plan</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head>Created</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each stores as store (store.id)}
							<Table.Row class="cursor-pointer hover:bg-muted/50" onclick={() => goto(`/admin/merchants/${store.id}`)}>
								<Table.Cell class="font-medium">{store.name}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{store.domain}</Table.Cell>
								<Table.Cell>{store.ownerEmail}</Table.Cell>
								<Table.Cell>
									{#if store.plan}
										<Badge variant="secondary">{store.plan.name}</Badge>
									{:else}
										<span class="text-muted-foreground">—</span>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-center">
									<Badge class={statusColors[store.status] || ''}>{store.status}</Badge>
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">{formatDate(store.createdAt)}</Table.Cell>
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
