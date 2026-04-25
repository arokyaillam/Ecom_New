<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Dialog from '$lib/components/ui/dialog';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Search from '@lucide/svelte/icons/search';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Package from '@lucide/svelte/icons/package';
	import History from '@lucide/svelte/icons/history';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import { hasPermission } from '$lib/permissions';

	let { data } = $props();
	let canWrite = $derived(hasPermission(data.userPermissions, 'inventory:write'));

	let searchValue = $state(data.search || '');
	let adjustOpen = $state(false);
	let historyOpen = $state(false);
	let selectedProduct = $state<any>(null);
	let adjusting = $state(false);
	let loadingHistory = $state(false);
	let historyItems = $state<any[]>([]);
	let historyTotal = $state(0);
	let historyPage = $state(1);

	let adjustForm = $state({
		currentQuantity: '',
		lowStockThreshold: '',
		reason: '',
	});

	const inventoryItems = $derived(data.inventory?.items || []);
	const total = $derived(data.inventory?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(Math.ceil(total / 20));

	const filters = [
		{ value: 'all', label: 'All' },
		{ value: 'lowStock', label: 'Low Stock' },
		{ value: 'outOfStock', label: 'Out of Stock' },
	];

	function filterBy(f: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (f && f !== 'all') params.set('filter', f);
		else params.delete('filter');
		params.set('page', '1');
		goto(`/dashboard/inventory?${params}`);
	}

	function doSearch() {
		const params = new URLSearchParams(page.url.searchParams);
		if (searchValue) params.set('search', searchValue);
		else params.delete('search');
		params.set('page', '1');
		goto(`/dashboard/inventory?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/dashboard/inventory?${params}`);
	}

	function openAdjust(product: any) {
		selectedProduct = product;
		adjustForm = {
			currentQuantity: String(product.currentQuantity ?? 0),
			lowStockThreshold: String(product.lowStockThreshold ?? 10),
			reason: '',
		};
		adjustOpen = true;
	}

	async function saveAdjust() {
		if (!selectedProduct) return;
		const qty = Number(adjustForm.currentQuantity);
		if (Number.isNaN(qty) || qty < 0) {
			toast.error('Please enter a valid quantity');
			return;
		}

		const payload: Record<string, any> = { currentQuantity: qty };
		const threshold = Number(adjustForm.lowStockThreshold);
		if (!Number.isNaN(threshold) && threshold >= 0) {
			payload.lowStockThreshold = threshold;
		}
		if (adjustForm.reason.trim()) {
			payload.reason = adjustForm.reason.trim();
		}

		adjusting = true;
		try {
			await apiFetch(`/merchant/inventory/${selectedProduct.id}`, {
				method: 'PATCH',
				body: JSON.stringify(payload),
			});
			toast.success('Stock updated');
			adjustOpen = false;
			invalidateAll();
		} catch (err: any) {
			toast.error(err?.message || 'Failed to update stock');
		} finally {
			adjusting = false;
		}
	}

	async function openHistory(product: any) {
		selectedProduct = product;
		historyOpen = true;
		historyPage = 1;
		await loadHistory(1);
	}

	async function loadHistory(p: number) {
		if (!selectedProduct) return;
		loadingHistory = true;
		try {
			const res = await apiFetch<{ items: any[]; total: number }>(`/merchant/inventory/${selectedProduct.id}/history?page=${p}&limit=20`);
			historyItems = res.items || [];
			historyTotal = res.total || 0;
			historyPage = p;
		} catch {
			toast.error('Failed to load history');
			historyItems = [];
			historyTotal = 0;
		} finally {
			loadingHistory = false;
		}
	}

	function goToHistoryPage(p: number) {
		loadHistory(p);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function stockStatus(product: any) {
		const qty = product.currentQuantity ?? 0;
		const threshold = product.lowStockThreshold ?? 10;
		if (qty <= 0) return { label: 'Out of Stock', color: 'bg-destructive/15 text-destructive border-destructive/30' };
		if (qty <= threshold) return { label: 'Low Stock', color: 'bg-warning/15 text-warning border-warning/30' };
		return { label: 'In Stock', color: 'bg-success/15 text-success border-success/30' };
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Inventory</h1>
			<p class="text-muted-foreground">Manage stock levels and track inventory history</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap gap-2">
		{#each filters as f}
			<Button
				variant={data.filter === f.value ? 'default' : 'outline'}
				size="sm"
				onclick={() => filterBy(f.value)}
			>
				{f.label}
			</Button>
		{/each}
	</div>

	<!-- Search -->
	<Card>
		<CardContent class="p-4">
			<form onsubmit={(e) => { e.preventDefault(); doSearch(); }} class="flex gap-3">
				<div class="relative flex-1">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						bind:value={searchValue}
						placeholder="Search products..."
						class="pl-10"
					/>
				</div>
				<Button type="submit" variant="secondary">Search</Button>
			</form>
		</CardContent>
	</Card>

	<!-- Inventory Table -->
	<Card>
		<CardHeader>
			<CardTitle class="text-base">
				{total} product{total !== 1 ? 's' : ''} found
			</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if inventoryItems.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<Package class="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p class="text-lg font-medium">No products found</p>
					<p class="text-sm mt-1">Your inventory is empty or no products match the current filter.</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-16">Image</Table.Head>
							<Table.Head>Name</Table.Head>
							<Table.Head>Category</Table.Head>
							<Table.Head class="text-center">Current Stock</Table.Head>
							<Table.Head class="text-center">Threshold</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head class="text-right w-40">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each inventoryItems as item (item.id)}
							{@const status = stockStatus(item)}
							<Table.Row>
								<Table.Cell>
									{#if item.images}
										{@const imgSrc = typeof item.images === 'string' ? item.images.split(',')[0] : ''}
										{#if imgSrc}
											<img src={imgSrc} alt={item.titleEn} class="w-10 h-10 rounded object-cover" />
										{:else}
											<div class="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">No img</div>
										{/if}
									{:else}
										<div class="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">No img</div>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<button
										class="text-left font-medium hover:underline"
										onclick={() => openHistory(item)}
									>
										{item.titleEn}
									</button>
									{#if item.titleAr}
										<br /><span class="text-xs text-muted-foreground">{item.titleAr}</span>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{item.category?.nameEn || '—'}
								</Table.Cell>
								<Table.Cell class="text-center font-medium">
									<span class={item.currentQuantity <= 0 ? 'text-destructive' : item.currentQuantity <= (item.lowStockThreshold ?? 10) ? 'text-warning' : ''}>
										{item.currentQuantity ?? 0}
									</span>
								</Table.Cell>
								<Table.Cell class="text-center text-muted-foreground">
									{item.lowStockThreshold ?? 10}
								</Table.Cell>
								<Table.Cell class="text-center">
									<Badge class={status.color}>{status.label}</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex items-center justify-end gap-1">
										{#if canWrite}
											<button
												onclick={() => openAdjust(item)}
												class="p-1.5 rounded hover:bg-muted transition-colors"
												title="Adjust Stock"
											>
												<SlidersHorizontal class="w-4 h-4 text-muted-foreground" />
											</button>
										{/if}
										<button
											onclick={() => openHistory(item)}
											class="p-1.5 rounded hover:bg-muted transition-colors"
											title="History"
										>
											<History class="w-4 h-4 text-muted-foreground" />
										</button>
									</div>
								</Table.Cell>
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

<!-- Adjust Stock Dialog -->
<Dialog.Root bind:open={adjustOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Adjust Stock</Dialog.Title>
			<Dialog.Description>
				{selectedProduct?.titleEn || ''}
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-2">
			<div class="space-y-2">
				<Label for="qty">New Quantity</Label>
				<Input id="qty" type="number" min="0" bind:value={adjustForm.currentQuantity} />
			</div>
			<div class="space-y-2">
				<Label for="threshold">Low Stock Threshold</Label>
				<Input id="threshold" type="number" min="0" bind:value={adjustForm.lowStockThreshold} />
			</div>
			<div class="space-y-2">
				<Label for="reason">Reason</Label>
				<Textarea id="reason" bind:value={adjustForm.reason} rows={3} placeholder="Restock, damage adjustment, etc." />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (adjustOpen = false)}>Cancel</Button>
			<Button onclick={saveAdjust} disabled={adjusting}>
				{adjusting ? 'Saving...' : 'Save'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- History Dialog -->
<Dialog.Root bind:open={historyOpen}>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Inventory History</Dialog.Title>
			<Dialog.Description>
				{selectedProduct?.titleEn || ''}
			</Dialog.Description>
		</Dialog.Header>
		<div class="py-2">
			{#if loadingHistory}
				<p class="text-sm text-muted-foreground py-4 text-center">Loading history...</p>
			{:else if historyItems.length === 0}
				<p class="text-sm text-muted-foreground py-4 text-center">No history records found.</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Date</Table.Head>
							<Table.Head class="text-center">Change</Table.Head>
							<Table.Head class="text-center">Previous → New</Table.Head>
							<Table.Head>Reason</Table.Head>
							<Table.Head>User</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each historyItems as h (h.id)}
							<Table.Row>
								<Table.Cell class="text-muted-foreground whitespace-nowrap">{formatDate(h.createdAt)}</Table.Cell>
								<Table.Cell class="text-center font-medium">
									<span class={h.changeQty > 0 ? 'text-success' : h.changeQty < 0 ? 'text-destructive' : ''}>
										{h.changeQty > 0 ? '+' : ''}{h.changeQty}
									</span>
								</Table.Cell>
								<Table.Cell class="text-center text-muted-foreground">
									{h.previousQty} → {h.newQty}
								</Table.Cell>
								<Table.Cell class="max-w-xs truncate">{h.reason || '—'}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{h.userEmail || '—'}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>

				{@const historyTotalPages = Math.ceil(historyTotal / 20)}
				{#if historyTotalPages > 1}
					<Separator />
					<div class="flex items-center justify-between p-2">
						<p class="text-sm text-muted-foreground">Page {historyPage} of {historyTotalPages}</p>
						<div class="flex gap-1">
							<Button variant="outline" size="sm" disabled={historyPage <= 1} onclick={() => goToHistoryPage(historyPage - 1)}>
								<ChevronLeft class="w-4 h-4" />
							</Button>
							<Button variant="outline" size="sm" disabled={historyPage >= historyTotalPages} onclick={() => goToHistoryPage(historyPage + 1)}>
								<ChevronRight class="w-4 h-4" />
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (historyOpen = false)}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
