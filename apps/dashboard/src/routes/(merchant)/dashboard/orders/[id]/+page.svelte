<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Table from '$lib/components/ui/table';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Package from '@lucide/svelte/icons/package';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import User from '@lucide/svelte/icons/user';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Clock from '@lucide/svelte/icons/clock';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Truck from '@lucide/svelte/icons/truck';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { hasPermission } from '$lib/permissions';

	let { data } = $props();
	let order = $derived(data.order);
	let canWriteOrders = $derived(hasPermission(data.userPermissions, 'orders:write'));
	let canRefund = $derived(hasPermission(data.userPermissions, 'orders:refund'));

	let actionLoading = $state(false);
	let cancelOpen = $state(false);
	let refundOpen = $state(false);
	let refundReason = $state('');

	const statusSteps = [
		{ key: 'pending', label: 'Pending', icon: Clock },
		{ key: 'processing', label: 'Processing', icon: Loader2 },
		{ key: 'shipped', label: 'Shipped', icon: Truck },
		{ key: 'delivered', label: 'Delivered', icon: CircleCheck },
	];

	const statusColors: Record<string, string> = {
		pending: 'bg-warning/15 text-warning border-warning/30',
		processing: 'bg-info/15 text-info border-info/30',
		shipped: 'bg-primary/15 text-primary border-primary/30',
		delivered: 'bg-success/15 text-success border-success/30',
		cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
		refunded: 'bg-info/15 text-info border-info/30',
	};

	function getStepState(stepKey: string, currentStatus: string) {
		if (currentStatus === 'cancelled' || currentStatus === 'refunded') return 'inactive';
		const stepIndex = statusSteps.findIndex((s) => s.key === stepKey);
		const currentIndex = statusSteps.findIndex((s) => s.key === currentStatus);
		if (stepIndex < currentIndex) return 'completed';
		if (stepIndex === currentIndex) return 'current';
		return 'inactive';
	}

	async function transitionStatus(newStatus: string) {
		actionLoading = true;
		try {
			await apiFetch(`/merchant/orders/${order.id}/status`, {
				method: 'PATCH',
				body: JSON.stringify({ status: newStatus }),
			});
			toast.success(`Order marked as ${newStatus}`);
			invalidateAll();
		} catch (err: any) {
			toast.error(err?.message || 'Failed to update status');
		} finally {
			actionLoading = false;
		}
	}

	async function submitCancel() {
		cancelOpen = false;
		await transitionStatus('cancelled');
	}

	async function submitRefund() {
		const reason = refundReason.trim();
		if (!reason) {
			toast.error('Please provide a reason for the refund');
			return;
		}
		actionLoading = true;
		try {
			await apiFetch(`/merchant/orders/${order.id}/refund`, {
				method: 'POST',
				body: JSON.stringify({ reason }),
			});
			toast.success('Refund issued successfully');
			refundOpen = false;
			refundReason = '';
			invalidateAll();
		} catch (err: any) {
			toast.error(err?.message || 'Failed to issue refund');
		} finally {
			actionLoading = false;
		}
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function formatPrice(p: string | number) {
		return `$${Number(p).toFixed(2)}`;
	}
</script>

<div class="space-y-6 max-w-5xl">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="sm" href="/dashboard/orders" class="gap-2">
				<ArrowLeft class="w-4 h-4" />
				Back
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Order #{order.orderNumber}</h1>
				<p class="text-muted-foreground">{formatDate(order.createdAt)}</p>
			</div>
		</div>
		<Badge class={`text-sm px-3 py-1 ${statusColors[order.status] || ''}`}>
			{order.status}
		</Badge>
	</div>

	<div class="grid md:grid-cols-3 gap-6">
		<!-- Main Column -->
		<div class="md:col-span-2 space-y-6">
			<!-- Status Timeline -->
			<Card>
				<CardHeader>
					<CardTitle class="text-base">Order Status</CardTitle>
				</CardHeader>
				<CardContent class="space-y-6">
					{#if order.status === 'cancelled'}
						<div class="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
							<XCircle class="w-6 h-6 shrink-0" />
							<div>
								<p class="font-semibold">Order Cancelled</p>
								<p class="text-sm opacity-80">This order has been cancelled and cannot be modified.</p>
							</div>
						</div>
					{:else if order.status === 'refunded'}
						<div class="flex items-center gap-3 p-4 rounded-lg bg-info/10 border border-info/20 text-info">
							<RotateCcw class="w-6 h-6 shrink-0" />
							<div>
								<p class="font-semibold">Order Refunded</p>
								<p class="text-sm opacity-80">A full refund has been issued for this order.</p>
							</div>
						</div>
					{:else}
						<div class="flex items-center">
							{#each statusSteps as step, i}
								<div class="flex flex-col items-center gap-2 flex-1">
									<div
										class={cn(
											'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
											getStepState(step.key, order.status) === 'current' && 'bg-primary border-primary text-primary-foreground',
											getStepState(step.key, order.status) === 'completed' && 'bg-success border-success text-success-foreground',
											getStepState(step.key, order.status) === 'inactive' && 'bg-muted border-muted-foreground/30 text-muted-foreground'
										)}
									>
										<step.icon class="w-5 h-5" />
									</div>
									<span
										class={cn(
											'text-xs font-medium',
											getStepState(step.key, order.status) === 'current' && 'text-primary',
											getStepState(step.key, order.status) === 'completed' && 'text-success',
											getStepState(step.key, order.status) === 'inactive' && 'text-muted-foreground'
										)}
									>
										{step.label}
									</span>
								</div>
								{#if i < statusSteps.length - 1}
									<div
										class={cn(
											'h-0.5 flex-1 mx-2 rounded-full',
											getStepState(step.key, order.status) === 'completed' ? 'bg-success' : 'bg-muted'
										)}
									></div>
								{/if}
							{/each}
						</div>
					{/if}

					<!-- Actions -->
					<div class="flex flex-wrap gap-3 pt-2">
						{#if order.status === 'pending' && canWriteOrders}
							<Button onclick={() => transitionStatus('processing')} disabled={actionLoading}>
								Mark as Processing
							</Button>
							<Button variant="destructive" onclick={() => (cancelOpen = true)} disabled={actionLoading}>
								Cancel Order
							</Button>
						{:else if order.status === 'processing' && canWriteOrders}
							<Button onclick={() => transitionStatus('shipped')} disabled={actionLoading}>
								Mark as Shipped
							</Button>
							<Button variant="destructive" onclick={() => (cancelOpen = true)} disabled={actionLoading}>
								Cancel Order
							</Button>
						{:else if order.status === 'shipped' && canWriteOrders}
							<Button onclick={() => transitionStatus('delivered')} disabled={actionLoading}>
								Mark as Delivered
							</Button>
						{:else if order.status === 'delivered' && canRefund}
							<Button variant="outline" onclick={() => (refundOpen = true)} disabled={actionLoading}>
								Issue Refund
							</Button>
						{/if}
					</div>
				</CardContent>
			</Card>

			<!-- Order Items -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Package class="w-5 h-5" />
						Items ({order.items?.length || 0})
					</CardTitle>
				</CardHeader>
				<CardContent class="p-0">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Product</Table.Head>
								<Table.Head class="text-center">Qty</Table.Head>
								<Table.Head class="text-right">Price</Table.Head>
								<Table.Head class="text-right">Total</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each order.items || [] as item (item.id)}
								<Table.Row>
									<Table.Cell>
										<div class="flex items-center gap-3">
											{#if item.productImage}
												<img src={item.productImage} alt={item.productTitle} class="w-10 h-10 rounded object-cover" />
											{/if}
											<div>
												<p class="font-medium">{item.productTitle}</p>
												{#if item.variantName}
													<p class="text-xs text-muted-foreground">{item.variantName}</p>
												{/if}
											</div>
										</div>
									</Table.Cell>
									<Table.Cell class="text-center">{item.quantity}</Table.Cell>
									<Table.Cell class="text-right">{formatPrice(item.price)}</Table.Cell>
									<Table.Cell class="text-right font-medium">{formatPrice(item.total)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</CardContent>
			</Card>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Totals -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-base">
						<CreditCard class="w-4 h-4" />
						Summary
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-2">
					<div class="flex justify-between text-sm">
						<span class="text-muted-foreground">Subtotal</span>
						<span>{formatPrice(order.subtotal)}</span>
					</div>
					{#if Number(order.discount) > 0}
						<div class="flex justify-between text-sm text-success">
							<span>Discount</span>
							<span>-{formatPrice(order.discount)}</span>
						</div>
					{/if}
					<div class="flex justify-between text-sm">
						<span class="text-muted-foreground">Shipping</span>
						<span>{formatPrice(order.shipping || 0)}</span>
					</div>
					<div class="flex justify-between text-sm">
						<span class="text-muted-foreground">Tax</span>
						<span>{formatPrice(order.tax || 0)}</span>
					</div>
					<Separator />
					<div class="flex justify-between font-bold text-lg">
						<span>Total</span>
						<span>{formatPrice(order.total)}</span>
					</div>
					<Separator />
					<div class="flex justify-between text-sm">
						<span class="text-muted-foreground">Payment</span>
						<Badge variant="outline" class="capitalize">{order.paymentStatus}</Badge>
					</div>
					{#if order.couponCode}
						<div class="flex justify-between text-sm">
							<span class="text-muted-foreground">Coupon</span>
							<Badge variant="secondary">{order.couponCode}</Badge>
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Customer -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-base">
						<User class="w-4 h-4" />
						Customer
					</CardTitle>
				</CardHeader>
				<CardContent class="text-sm space-y-1">
					<p class="font-medium">{order.email}</p>
					{#if order.phone}
						<p class="text-muted-foreground">{order.phone}</p>
					{/if}
				</CardContent>
			</Card>

			<!-- Shipping Address -->
			{#if order.shippingAddressLine1}
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2 text-base">
							<MapPin class="w-4 h-4" />
							Shipping
						</CardTitle>
					</CardHeader>
					<CardContent class="text-sm space-y-1">
						{#if order.shippingFirstName}
							<p class="font-medium">{order.shippingFirstName} {order.shippingLastName || ''}</p>
						{/if}
						<p>{order.shippingAddressLine1}</p>
						{#if order.shippingAddressLine2}<p>{order.shippingAddressLine2}</p>{/if}
						<p>{order.shippingCity}{order.shippingState ? `, ${order.shippingState}` : ''} {order.shippingPostalCode || ''}</p>
						<p>{order.shippingCountry}</p>
					</CardContent>
				</Card>
			{/if}

			<!-- Notes -->
			{#if order.notes || order.adminNotes}
				<Card>
					<CardHeader>
						<CardTitle class="text-base">Notes</CardTitle>
					</CardHeader>
					<CardContent class="text-sm space-y-2">
						{#if order.notes}
							<div>
								<p class="text-muted-foreground text-xs">Customer note</p>
								<p>{order.notes}</p>
							</div>
						{/if}
						{#if order.adminNotes}
							<div>
								<p class="text-muted-foreground text-xs">Admin note</p>
								<p>{order.adminNotes}</p>
							</div>
						{/if}
					</CardContent>
				</Card>
			{/if}
		</div>
	</div>
</div>

<!-- Cancel Confirmation Dialog -->
<Dialog.Root bind:open={cancelOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Cancel Order</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to cancel this order? This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (cancelOpen = false)}>Keep Order</Button>
			<Button variant="destructive" onclick={submitCancel} disabled={actionLoading}>Cancel Order</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Refund Dialog -->
<Dialog.Root bind:open={refundOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Issue Refund</Dialog.Title>
			<Dialog.Description>
				This will issue a full refund for the order. Please provide a reason.
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-3 py-2">
			<Label for="refund-reason">Reason</Label>
			<Textarea
				id="refund-reason"
				bind:value={refundReason}
				placeholder="Reason for refund..."
				rows={3}
			/>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (refundOpen = false)}>Cancel</Button>
			<Button variant="destructive" onclick={submitRefund} disabled={actionLoading}>Issue Refund</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
