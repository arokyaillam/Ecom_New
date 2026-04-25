<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Dialog from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import LifeBuoy from '@lucide/svelte/icons/life-buoy';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import MessageSquare from '@lucide/svelte/icons/message-square';

	let { data, form } = $props();

	let activeTab = $state<'list' | 'new'>('list');
	let selectedTicket = $state<{
		id: string;
		subject: string;
		description: string;
		category: string;
		priority: string;
		status: string;
		resolution: string | null;
		createdAt: string;
		updatedAt: string;
	} | null>(null);
	let detailOpen = $state(false);
	let closeConfirmOpen = $state(false);

	const items = $derived(data.tickets?.items || []);
	const total = $derived(data.tickets?.total || 0);
	const currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	const totalPages = $derived(data.tickets?.totalPages || 0);

	const statusFilters = [
		{ value: '', label: 'All' },
		{ value: 'open', label: 'Open' },
		{ value: 'in_progress', label: 'In Progress' },
		{ value: 'resolved', label: 'Resolved' },
		{ value: 'closed', label: 'Closed' },
	];

	const categoryOptions = [
		{ value: 'billing', label: 'Billing' },
		{ value: 'technical', label: 'Technical' },
		{ value: 'general', label: 'General' },
		{ value: 'feature_request', label: 'Feature Request' },
	];

	const priorityOptions = [
		{ value: 'low', label: 'Low' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'high', label: 'High' },
		{ value: 'urgent', label: 'Urgent' },
	];

	const statusColors: Record<string, string> = {
		open: 'bg-warning/15 text-warning border-warning/30',
		in_progress: 'bg-info/15 text-info border-info/30',
		resolved: 'bg-success/15 text-success border-success/30',
		closed: 'bg-muted text-muted-foreground border-muted',
	};

	const priorityColors: Record<string, string> = {
		low: 'bg-muted text-muted-foreground border-muted',
		medium: 'bg-info/15 text-info border-info/30',
		high: 'bg-warning/15 text-warning border-warning/30',
		urgent: 'bg-destructive/15 text-destructive border-destructive/30',
	};

	function filterByStatus(s: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (s) params.set('status', s);
		else params.delete('status');
		params.set('page', '1');
		goto(`/dashboard/support?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/dashboard/support?${params}`);
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

	function openDetail(ticket: typeof selectedTicket) {
		selectedTicket = ticket;
		detailOpen = true;
	}

	function showCloseConfirm() {
		closeConfirmOpen = true;
	}

	$effect(() => {
		if (form?.success) {
			toast.success(activeTab === 'new' ? 'Ticket created successfully' : 'Ticket closed');
			activeTab = 'list';
			invalidateAll();
		}
		if (form?.error) {
			toast.error(form.error);
		}
	});
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Support</h1>
			<p class="text-muted-foreground">Get help from our team</p>
		</div>
		{#if activeTab === 'list'}
			<Button onclick={() => (activeTab = 'new')}>
				<Plus class="w-4 h-4 mr-2" />
				New Ticket
			</Button>
		{:else}
			<Button variant="outline" onclick={() => (activeTab = 'list')}>
				<X class="w-4 h-4 mr-2" />
				Cancel
			</Button>
		{/if}
	</div>

	{#if activeTab === 'list'}
		<!-- Filters -->
		<div class="flex flex-wrap gap-2">
			{#each statusFilters as f}
				<Button
					variant={data.status === f.value ? 'default' : 'outline'}
					size="sm"
					onclick={() => filterByStatus(f.value)}
				>
					{f.label}
				</Button>
			{/each}
		</div>

		<!-- Tickets Table -->
		<Card>
			<CardHeader>
				<CardTitle class="text-base">My Tickets</CardTitle>
			</CardHeader>
			<CardContent class="p-0">
				{#if items.length === 0}
					<div class="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
						<LifeBuoy class="w-12 h-12 mb-3 opacity-50" />
						<p class="text-lg font-medium">No tickets found</p>
						<p class="text-sm">Create a new ticket to get help from our team</p>
					</div>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Subject</Table.Head>
								<Table.Head class="w-28">Category</Table.Head>
								<Table.Head class="w-24">Priority</Table.Head>
								<Table.Head class="w-24">Status</Table.Head>
								<Table.Head class="w-44">Created</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each items as ticket (ticket.id)}
								<Table.Row
									class="cursor-pointer hover:bg-muted/50"
									onclick={() => openDetail(ticket)}
								>
									<Table.Cell class="font-medium text-sm">{ticket.subject}</Table.Cell>
									<Table.Cell class="capitalize text-sm">{ticket.category.replace('_', ' ')}</Table.Cell>
									<Table.Cell>
										<Badge class={priorityColors[ticket.priority] || ''}>
											{ticket.priority}
										</Badge>
									</Table.Cell>
									<Table.Cell>
										<Badge class={statusColors[ticket.status] || ''}>
											{ticket.status.replace('_', ' ')}
										</Badge>
									</Table.Cell>
									<Table.Cell class="text-muted-foreground whitespace-nowrap text-sm">
										{formatDate(ticket.createdAt)}
									</Table.Cell>
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
	{:else}
		<!-- New Ticket Form -->
		<Card>
			<CardHeader>
				<CardTitle class="text-base">New Support Ticket</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					method="POST"
					action="?/create"
					class="space-y-4"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'failure') {
								toast.error(result.data?.error as string || 'Failed to create ticket');
							} else if (result.type === 'success') {
								toast.success('Ticket created successfully');
								activeTab = 'list';
								await invalidateAll();
							}
						};
					}}
				>
					<div>
						<label class="text-sm font-medium mb-1 block" for="subject">Subject</label>
						<Input id="subject" name="subject" placeholder="Brief description of the issue" required />
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label class="text-sm font-medium mb-1 block" for="category">Category</label>
							<select
								id="category"
								name="category"
								required
								class="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							>
								{#each categoryOptions as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>

						<div>
							<label class="text-sm font-medium mb-1 block" for="priority">Priority</label>
							<select
								id="priority"
								name="priority"
								required
								class="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							>
								{#each priorityOptions as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							</select>
						</div>
					</div>

					<div>
						<label class="text-sm font-medium mb-1 block" for="description">Description</label>
						<textarea
							id="description"
							name="description"
							rows="5"
							placeholder="Provide detailed information about your issue..."
							required
							class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
						></textarea>
					</div>

					<div class="flex justify-end">
						<Button type="submit">
							<MessageSquare class="w-4 h-4 mr-2" />
							Submit Ticket
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	{/if}
</div>

<!-- Ticket Detail Dialog -->
<Dialog.Root bind:open={detailOpen}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Ticket Detail</Dialog.Title>
			<Dialog.Description>
				View the details of your support ticket.
			</Dialog.Description>
		</Dialog.Header>

		{#if selectedTicket}
			<div class="space-y-4 mt-4 text-sm">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<p class="text-muted-foreground">Subject</p>
						<p class="font-medium">{selectedTicket.subject}</p>
					</div>
					<div>
						<p class="text-muted-foreground">Category</p>
						<p class="font-medium capitalize">{selectedTicket.category.replace('_', ' ')}</p>
					</div>
					<div>
						<p class="text-muted-foreground">Priority</p>
						<Badge class={priorityColors[selectedTicket.priority] || ''}>
							{selectedTicket.priority}
						</Badge>
					</div>
					<div>
						<p class="text-muted-foreground">Status</p>
						<Badge class={statusColors[selectedTicket.status] || ''}>
							{selectedTicket.status.replace('_', ' ')}
						</Badge>
					</div>
				</div>

				<div>
					<p class="text-muted-foreground">Description</p>
					<p class="font-medium whitespace-pre-wrap">{selectedTicket.description}</p>
				</div>

				{#if selectedTicket.resolution}
					<div>
						<p class="text-muted-foreground">Resolution</p>
						<p class="font-medium whitespace-pre-wrap">{selectedTicket.resolution}</p>
					</div>
				{/if}

				<div class="grid grid-cols-2 gap-4 text-muted-foreground">
					<div>
						<p>Created</p>
						<p class="font-medium text-foreground">{formatDate(selectedTicket.createdAt)}</p>
					</div>
					<div>
						<p>Updated</p>
						<p class="font-medium text-foreground">{formatDate(selectedTicket.updatedAt)}</p>
					</div>
				</div>

				{#if selectedTicket.status === 'open' || selectedTicket.status === 'in_progress'}
					<form
						method="POST"
						action="?/close"
						class="pt-2"
						use:enhance={() => {
							return async ({ result }) => {
								if (result.type === 'failure') {
									toast.error(result.data?.error as string || 'Failed to close ticket');
								} else if (result.type === 'success') {
									toast.success('Ticket closed');
									detailOpen = false;
									await invalidateAll();
								}
							};
						}}
					>
						<input type="hidden" name="ticketId" value={selectedTicket.id} />
						<Button type="submit" variant="outline" class="w-full">
							Close Ticket
						</Button>
					</form>
				{/if}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
