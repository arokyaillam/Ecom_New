<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Bell from '@lucide/svelte/icons/bell';
	import Package from '@lucide/svelte/icons/package';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import CheckCheck from '@lucide/svelte/icons/check-check';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let { data } = $props();

	let items = $derived(data.notifications?.items || []);
	let total = $derived(data.notifications?.total || 0);
	let currentPage = $derived(Number(page.url.searchParams.get('page') || '1'));
	let totalPages = $derived(data.notifications?.totalPages || 0);

	const filters = [
		{ value: '', label: 'All' },
		{ value: 'false', label: 'Unread' },
	];

	function filterBy(f: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (f) params.set('isRead', f);
		else params.delete('isRead');
		params.set('page', '1');
		goto(`/dashboard/notifications?${params}`);
	}

	function goToPage(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		goto(`/dashboard/notifications?${params}`);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	const typeIcons: Record<string, any> = {
		order: ShoppingCart,
		inventory: Package,
		payment: CreditCard,
		system: AlertTriangle,
	};

	const typeColors: Record<string, string> = {
		order: 'bg-primary/15 text-primary border-primary/30',
		inventory: 'bg-warning/15 text-warning border-warning/30',
		payment: 'bg-destructive/15 text-destructive border-destructive/30',
		system: 'bg-muted text-muted-foreground border-muted',
	};

	async function markAsRead(id: string, linkUrl?: string | null) {
		try {
			await apiFetch(`/api/v1/merchant/notifications/${id}/read`, { method: 'PATCH' });
			await invalidateAll();
			if (linkUrl) {
				goto(linkUrl);
			}
		} catch {
			toast.error('Failed to mark as read');
		}
	}

	async function markAllAsRead() {
		try {
			await apiFetch('/api/v1/merchant/notifications/read-all', { method: 'POST' });
			await invalidateAll();
			toast.success('All notifications marked as read');
		} catch {
			toast.error('Failed to mark all as read');
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Notifications</h1>
			<p class="text-muted-foreground">Stay updated on orders, inventory, and payments</p>
		</div>
		<Button variant="outline" onclick={markAllAsRead}>
			<CheckCheck class="w-4 h-4 mr-2" />
			Mark all as read
		</Button>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap gap-2">
		{#each filters as f}
			<Button
				variant={data.isRead === f.value ? 'default' : 'outline'}
				size="sm"
				onclick={() => filterBy(f.value)}
			>
				{f.label}
			</Button>
		{/each}
	</div>

	<!-- Notifications List -->
	<Card>
		<CardHeader>
			<CardTitle class="text-base">Recent Alerts</CardTitle>
		</CardHeader>
		<CardContent class="space-y-2">
			{#if items.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<Bell class="w-10 h-10 text-muted-foreground/50 mb-3" />
					<p class="text-muted-foreground font-medium">No notifications</p>
					<p class="text-sm text-muted-foreground/70">You're all caught up!</p>
				</div>
			{:else}
				{#each items as n (n.id)}
					<button
						class="w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors {n.isRead ? 'bg-muted/40 hover:bg-muted/60' : 'bg-card hover:bg-accent border-l-4 border-primary'}"
						onclick={() => markAsRead(n.id, n.linkUrl)}
						role="link"
					>
						<div class="mt-0.5">
							<svelte:component
								this={typeIcons[n.type] || Bell}
								class="w-5 h-5 {n.isRead ? 'text-muted-foreground' : 'text-primary'}"
							/>
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="text-sm font-medium">{n.title}</span>
								<Badge variant="outline" class="text-xs capitalize {typeColors[n.type] || ''}">{n.type}</Badge>
								{#if !n.isRead}
									<span class="w-2 h-2 rounded-full bg-primary"></span>
								{/if}
							</div>
							<p class="text-sm text-muted-foreground truncate">{n.message}</p>
							<p class="text-xs text-muted-foreground/70 mt-1">{formatDate(n.createdAt)}</p>
						</div>
					</button>
					{#if n !== items[items.length - 1]}
						<Separator />
					{/if}
				{/each}
			{/if}
		</CardContent>
	</Card>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex items-center justify-between">
			<Button variant="outline" size="sm" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>
				<ChevronLeft class="w-4 h-4 mr-1" /> Prev
			</Button>
			<span class="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
			<Button variant="outline" size="sm" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)}>
				Next <ChevronRight class="w-4 h-4 ml-1" />
			</Button>
		</div>
	{/if}
</div>
