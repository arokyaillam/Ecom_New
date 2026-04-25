<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Dialog from '$lib/components/ui/dialog';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	let { data } = $props();

	const items = $derived(data.auditLogs?.items || []);
	const total = $derived(data.auditLogs?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(data.auditLogs?.totalPages || 0);

	let selectedLog = $state<{
		id: string;
		createdAt: string;
		userId?: string | null;
		userEmail?: string | null;
		action: string;
		entityType: string;
		entityId?: string | null;
		description: string;
		previousValues?: Record<string, unknown> | null;
		newValues?: Record<string, unknown> | null;
		metadata?: Record<string, unknown> | null;
	} | null>(null);

	let dialogOpen = $state(false);

	const actionOptions = [
		{ value: '', label: 'All Actions' },
		{ value: 'create', label: 'Create' },
		{ value: 'update', label: 'Update' },
		{ value: 'delete', label: 'Delete' },
		{ value: 'refund', label: 'Refund' },
		{ value: 'status_change', label: 'Status Change' },
		{ value: 'block', label: 'Block' },
		{ value: 'permission_change', label: 'Permission Change' },
		{ value: 'inventory_adjust', label: 'Inventory Adjust' },
	];

	const entityOptions = [
		{ value: '', label: 'All Entities' },
		{ value: 'order', label: 'Order' },
		{ value: 'product', label: 'Product' },
		{ value: 'customer', label: 'Customer' },
		{ value: 'staff', label: 'Staff' },
		{ value: 'inventory', label: 'Inventory' },
		{ value: 'payment', label: 'Payment' },
		{ value: 'settings', label: 'Settings' },
	];

	const actionColors: Record<string, string> = {
		create: 'bg-success/15 text-success border-success/30',
		update: 'bg-info/15 text-info border-info/30',
		delete: 'bg-destructive/15 text-destructive border-destructive/30',
		refund: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
		status_change: 'bg-warning/15 text-warning border-warning/30',
		block: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
		permission_change: 'bg-pink-500/15 text-pink-500 border-pink-500/30',
		inventory_adjust: 'bg-primary/15 text-primary border-primary/30',
	};

	function buildParams(overrides: Record<string, string>) {
		const params = new URLSearchParams(page.url.searchParams);
		for (const [key, value] of Object.entries(overrides)) {
			if (value) params.set(key, value);
			else params.delete(key);
		}
		params.set('page', '1');
		return params;
	}

	function applyFilters() {
		const params = buildParams({
			action: data.action,
			entityType: data.entityType,
			userId: data.userId,
			startDate: data.startDate,
			endDate: data.endDate,
		});
		goto(`/dashboard/audit-logs?${params}`);
	}

	function clearFilters() {
		goto('/dashboard/audit-logs?page=1');
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/dashboard/audit-logs?${params}`);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function openDetail(log: typeof selectedLog) {
		selectedLog = log;
		dialogOpen = true;
	}

	function formatJson(obj: unknown) {
		return JSON.stringify(obj, null, 2);
	}

	const hasFilters = $derived(
		!!data.action || !!data.entityType || !!data.userId || !!data.startDate || !!data.endDate,
	);
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Audit Logs</h1>
		<p class="text-muted-foreground">Track every change in your store</p>
	</div>

	<!-- Filters -->
	<Card>
		<CardContent class="p-4">
			<div class="flex flex-wrap gap-3 items-end">
				<div class="w-40">
					<label class="text-xs font-medium text-muted-foreground mb-1 block" for="action-filter">Action</label>
					<select
						id="action-filter"
						class="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
						value={data.action}
						onchange={(e: Event) => {
							const params = buildParams({ action: (e.target as HTMLSelectElement).value });
							goto(`/dashboard/audit-logs?${params}`);
						}}
					>
						{#each actionOptions as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</div>

				<div class="w-40">
					<label class="text-xs font-medium text-muted-foreground mb-1 block" for="entity-filter">Entity</label>
					<select
						id="entity-filter"
						class="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
						value={data.entityType}
						onchange={(e: Event) => {
							const params = buildParams({ entityType: (e.target as HTMLSelectElement).value });
							goto(`/dashboard/audit-logs?${params}`);
						}}
					>
						{#each entityOptions as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</div>

				<div class="w-44">
					<label class="text-xs font-medium text-muted-foreground mb-1 block" for="start-date">Start Date</label>
					<Input
						id="start-date"
						type="date"
						value={data.startDate}
						onchange={(e: Event) => {
							const params = buildParams({ startDate: (e.target as HTMLInputElement).value });
							goto(`/dashboard/audit-logs?${params}`);
						}}
					/>
				</div>

				<div class="w-44">
					<label class="text-xs font-medium text-muted-foreground mb-1 block" for="end-date">End Date</label>
					<Input
						id="end-date"
						type="date"
						value={data.endDate}
						onchange={(e: Event) => {
							const params = buildParams({ endDate: (e.target as HTMLInputElement).value });
							goto(`/dashboard/audit-logs?${params}`);
						}}
					/>
				</div>

				<div class="w-48">
					<label class="text-xs font-medium text-muted-foreground mb-1 block" for="user-id">User ID</label>
					<Input
						id="user-id"
						placeholder="Filter by user ID"
						value={data.userId}
						onchange={(e: Event) => {
							const params = buildParams({ userId: (e.target as HTMLInputElement).value });
							goto(`/dashboard/audit-logs?${params}`);
						}}
					/>
				</div>

				{#if hasFilters}
					<Button variant="ghost" size="sm" onclick={clearFilters}>
						<X class="w-4 h-4 mr-1" />
						Clear
					</Button>
				{/if}
			</div>
		</CardContent>
	</Card>

	<!-- Audit Logs Table -->
	<Card>
		<CardHeader>
			<CardTitle class="text-base">{total} log{total !== 1 ? 's' : ''}</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if items.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
					<ClipboardList class="w-12 h-12 mb-3 opacity-50" />
					<p class="text-lg font-medium">No audit logs found</p>
					<p class="text-sm">Changes will appear here once they occur</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-44">Date</Table.Head>
							<Table.Head>User</Table.Head>
							<Table.Head class="w-32">Action</Table.Head>
							<Table.Head class="w-28">Entity</Table.Head>
							<Table.Head>Description</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each items as log (log.id)}
							<Table.Row
								class="cursor-pointer hover:bg-muted/50"
								onclick={() => openDetail(log)}
							>
								<Table.Cell class="text-muted-foreground whitespace-nowrap">
									{formatDate(log.createdAt)}
								</Table.Cell>
								<Table.Cell class="text-sm">
									{log.userEmail || log.userId || 'System'}
								</Table.Cell>
								<Table.Cell>
									<Badge class={actionColors[log.action] || 'bg-muted text-muted-foreground border-muted'} >
										{log.action}
									</Badge>
								</Table.Cell>
								<Table.Cell class="capitalize text-sm">{log.entityType}</Table.Cell>
								<Table.Cell class="text-sm max-w-md truncate">{log.description}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>

				{#if totalPages > 1}
					<Separator />
					<div class="flex items-center justify-between p-4">
						<p class="text-sm text-muted-foreground">
							Page {currentPage} of {totalPages}
						</p>
						<div class="flex gap-1">
							<Button
								variant="outline"
								size="sm"
								disabled={currentPage <= 1}
								onclick={() => goToPage(currentPage - 1)}
							>
								<ChevronLeft class="w-4 h-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={currentPage >= totalPages}
								onclick={() => goToPage(currentPage + 1)}
							>
								<ChevronRight class="w-4 h-4" />
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</CardContent>
	</Card>
</div>

<!-- Detail Dialog -->
<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="max-w-2xl max-h-[80vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Audit Log Detail</Dialog.Title>
			<Dialog.Description>
				Full details for the selected audit log entry.
			</Dialog.Description>
		</Dialog.Header>

		{#if selectedLog}
			<div class="space-y-4 mt-4">
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<p class="text-muted-foreground">Date</p>
						<p class="font-medium">{formatDate(selectedLog.createdAt)}</p>
					</div>
					<div>
						<p class="text-muted-foreground">User</p>
						<p class="font-medium">{selectedLog.userEmail || selectedLog.userId || 'System'}</p>
					</div>
					<div>
						<p class="text-muted-foreground">Action</p>
						<Badge class={actionColors[selectedLog.action] || 'bg-muted text-muted-foreground border-muted'}>
							{selectedLog.action}
						</Badge>
					</div>
					<div>
						<p class="text-muted-foreground">Entity</p>
						<p class="font-medium capitalize">{selectedLog.entityType}
							{#if selectedLog.entityId}
								<span class="text-muted-foreground"> ({selectedLog.entityId})</span>
							{/if}
						</p>
					</div>
				</div>

				<div class="text-sm">
					<p class="text-muted-foreground">Description</p>
					<p class="font-medium">{selectedLog.description}</p>
				</div>

				{#if selectedLog.previousValues}
					<div class="text-sm">
						<p class="text-muted-foreground mb-1">Previous Values</p>
						<pre class="bg-muted p-3 rounded-md text-xs overflow-x-auto">{formatJson(selectedLog.previousValues)}</pre>
					</div>
				{/if}

				{#if selectedLog.newValues}
					<div class="text-sm">
						<p class="text-muted-foreground mb-1">New Values</p>
						<pre class="bg-muted p-3 rounded-md text-xs overflow-x-auto">{formatJson(selectedLog.newValues)}</pre>
					</div>
				{/if}

				{#if selectedLog.metadata}
					<div class="text-sm">
						<p class="text-muted-foreground mb-1">Metadata</p>
						<pre class="bg-muted p-3 rounded-md text-xs overflow-x-auto">{formatJson(selectedLog.metadata)}</pre>
					</div>
				{/if}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
