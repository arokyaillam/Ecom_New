<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { Separator } from '$lib/components/ui/separator';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Building2 from '@lucide/svelte/icons/building-2';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let { data } = $props();

	const merchants = $derived(data.merchants?.merchants || data.merchants?.stores || []);
	const total = $derived(data.merchants?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));

	const statuses = ['', 'pending', 'active', 'suspended'];

	const statusColors: Record<string, string> = {
		pending: 'bg-warning/15 text-warning border-warning/30',
		active: 'bg-success/15 text-success border-success/30',
		suspended: 'bg-destructive/15 text-destructive border-destructive/30',
	};

	function filterByStatus(s: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (s) params.set('status', s);
		else params.delete('status');
		params.set('page', '1');
		goto(`/admin/merchants?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/admin/merchants?${params}`);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Merchants</h1>
		<p class="text-muted-foreground">Manage merchant stores and approvals</p>
	</div>

	<div class="flex flex-wrap gap-2">
		{#each statuses as s}
			<Button variant={data.status === s ? 'default' : 'outline'} size="sm" onclick={() => filterByStatus(s)}>
				{s || 'All'}
			</Button>
		{/each}
	</div>

	<Card>
		<CardHeader>
			<CardTitle class="text-base">{total} merchant{total !== 1 ? 's' : ''}</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if merchants.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<Building2 class="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p class="text-lg font-medium">No merchants found</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Store Name</Table.Head>
							<Table.Head>Domain</Table.Head>
							<Table.Head>Owner Email</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head>Created</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each merchants as merchant (merchant.id)}
							<Table.Row class="cursor-pointer hover:bg-muted/50" onclick={() => goto(`/admin/merchants/${merchant.id}`)}>
								<Table.Cell class="font-medium">{merchant.name}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{merchant.domain}</Table.Cell>
								<Table.Cell>{merchant.ownerEmail}</Table.Cell>
								<Table.Cell class="text-center">
									<Badge class={statusColors[merchant.status] || ''}>{merchant.status}</Badge>
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">{formatDate(merchant.createdAt)}</Table.Cell>
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
