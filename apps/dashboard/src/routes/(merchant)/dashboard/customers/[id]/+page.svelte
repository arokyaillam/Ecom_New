<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Table from '$lib/components/ui/table';
	import { hasPermission } from '$lib/permissions';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import User from '@lucide/svelte/icons/user';
	import Mail from '@lucide/svelte/icons/mail';
	import Phone from '@lucide/svelte/icons/phone';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Ban from '@lucide/svelte/icons/ban';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	let { data } = $props();

	let customer = $derived(data.customer?.customer);
	let ltv = $derived(data.customer?.ltv ?? '0');
	let orderCount = $derived(data.customer?.orderCount ?? 0);
	let orders = $derived(data.customer?.orders || []);
	let canWrite = $derived(hasPermission(data.userPermissions, 'customers:write'));
	let blocking = $state(false);

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatPrice(p: string | number) {
		return `$${Number(p).toFixed(2)}`;
	}

	async function blockCustomer() {
		blocking = true;
		try {
			const reason = window.prompt('Block reason (optional):');
			if (reason === null) return;
			await apiFetch(`/merchant/customers/${customer.id}/block`, {
				method: 'POST',
				body: JSON.stringify({ reason: reason || undefined }),
			});
			toast.success('Customer blocked');
			invalidateAll();
		} catch {
			toast.error('Failed to block customer');
		} finally {
			blocking = false;
		}
	}

	async function unblockCustomer() {
		blocking = true;
		try {
			await apiFetch(`/merchant/customers/${customer.id}/unblock`, { method: 'POST' });
			toast.success('Customer unblocked');
			invalidateAll();
		} catch {
			toast.error('Failed to unblock customer');
		} finally {
			blocking = false;
		}
	}
</script>

<div class="space-y-6 max-w-5xl">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="sm" href="/dashboard/customers" class="gap-2">
				<ArrowLeft class="w-4 h-4" />
				Back
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">
					{customer.firstName || ''} {customer.lastName || ''}
				</h1>
				{#if !customer.firstName && !customer.lastName}
					<p class="text-muted-foreground">Customer #{customer.id?.slice(-8)}</p>
				{/if}
			</div>
		</div>
		<div class="flex items-center gap-2">
			{#if customer.isBlocked}
				<Badge class="bg-destructive/15 text-destructive border-destructive/30">
					<Ban class="w-3 h-3 mr-1" />
					Blocked
				</Badge>
			{:else}
				<Badge class={`text-sm px-3 py-1 ${customer.isVerified ? 'bg-success/15 text-success border-success/30' : ''}`}>
					{customer.isVerified ? 'Verified' : 'Unverified'}
				</Badge>
			{/if}
			{#if canWrite}
				{#if customer.isBlocked}
					<Button variant="outline" size="sm" disabled={blocking} onclick={unblockCustomer}>
						Unblock Customer
					</Button>
				{:else}
					<Button variant="destructive" size="sm" disabled={blocking} onclick={blockCustomer}>
						<Ban class="w-3.5 h-3.5 mr-1" />
						Block Customer
					</Button>
				{/if}
			{/if}
		</div>
	</div>

	{#if customer.isBlocked}
		<div class="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			<div class="flex items-center gap-2 font-medium">
				<Ban class="w-4 h-4" />
				This customer is blocked
				{#if customer.blockedReason}
					<span class="font-normal text-muted-foreground">— {customer.blockedReason}</span>
				{/if}
			</div>
			{#if customer.blockedAt}
				<p class="mt-1 text-xs text-muted-foreground">Blocked on {formatDate(customer.blockedAt)}</p>
			{/if}
		</div>
	{/if}

	<!-- KPI Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<Card>
			<CardContent class="p-4 flex items-center gap-4">
				<div class="rounded-full bg-primary/10 p-2.5">
					<DollarSign class="w-5 h-5 text-primary" />
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Lifetime Value</p>
					<p class="text-xl font-bold">{formatPrice(ltv)}</p>
				</div>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="p-4 flex items-center gap-4">
				<div class="rounded-full bg-primary/10 p-2.5">
					<ShoppingCart class="w-5 h-5 text-primary" />
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Total Orders</p>
					<p class="text-xl font-bold">{orderCount}</p>
				</div>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="p-4 flex items-center gap-4">
				<div class="rounded-full bg-primary/10 p-2.5">
					<Calendar class="w-5 h-5 text-primary" />
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Joined</p>
					<p class="text-xl font-bold">{formatDate(customer.createdAt)}</p>
				</div>
			</CardContent>
		</Card>
	</div>

	<div class="grid md:grid-cols-3 gap-6">
		<!-- Main Column -->
		<div class="md:col-span-2 space-y-6">
			<!-- Order History -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<ShoppingCart class="w-5 h-5" />
						Order History ({orders.length})
					</CardTitle>
				</CardHeader>
				<CardContent class="p-0">
					{#if orders.length}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Order</Table.Head>
									<Table.Head>Date</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head class="text-right">Total</Table.Head>
									<Table.Head class="text-right"></Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each orders as order (order.id)}
									<Table.Row class="hover:bg-muted/50">
										<Table.Cell class="font-medium">
											#{order.orderNumber || order.id?.slice(-8)}
										</Table.Cell>
										<Table.Cell class="text-muted-foreground">{formatDate(order.createdAt)}</Table.Cell>
										<Table.Cell>
											<Badge variant="outline" class="capitalize text-xs">{order.status}</Badge>
										</Table.Cell>
										<Table.Cell class="text-right font-medium">{formatPrice(order.total)}</Table.Cell>
										<Table.Cell class="text-right">
											<Button variant="ghost" size="sm" href={`/dashboard/orders/${order.id}`}>
												<ExternalLink class="w-4 h-4" />
											</Button>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{:else}
						<div class="py-12 text-center text-muted-foreground">
							<ShoppingCart class="w-10 h-10 mx-auto mb-2 opacity-50" />
							<p class="text-sm">No orders yet</p>
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Contact Info -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-base">
						<User class="w-4 h-4" />
						Contact Info
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3 text-sm">
					<div class="flex items-center gap-2">
						<Mail class="w-4 h-4 text-muted-foreground" />
						<span>{customer.email}</span>
					</div>
					{#if customer.phone}
						<div class="flex items-center gap-2">
							<Phone class="w-4 h-4 text-muted-foreground" />
							<span>{customer.phone}</span>
						</div>
					{/if}
					<Separator />
					<div class="flex items-center gap-2 text-muted-foreground">
						<Calendar class="w-4 h-4" />
						<span>Joined {formatDate(customer.createdAt)}</span>
					</div>
					{#if customer.lastLoginAt}
						<div class="flex items-center gap-2 text-muted-foreground">
							<ShieldCheck class="w-4 h-4" />
							<span>Last login {formatDate(customer.lastLoginAt)}</span>
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Addresses -->
			{#if customer.addresses?.length}
				<Card>
					<CardHeader>
						<CardTitle class="text-base">Addresses</CardTitle>
					</CardHeader>
					<CardContent class="space-y-3">
						{#each customer.addresses as address (address.id)}
							<div class="text-sm">
								{#if address.isDefault}
									<Badge variant="secondary" class="mb-1">Default</Badge>
								{/if}
								<p class="font-medium">{address.firstName} {address.lastName}</p>
								<p class="text-muted-foreground">{address.line1 || address.addressLine1}</p>
								{#if address.line2 || address.addressLine2}
									<p class="text-muted-foreground">{address.line2 || address.addressLine2}</p>
								{/if}
								<p class="text-muted-foreground">{address.city}, {address.state} {address.postalCode}</p>
								<p class="text-muted-foreground">{address.country}</p>
							</div>
						{/each}
					</CardContent>
				</Card>
			{/if}
		</div>
	</div>
</div>
