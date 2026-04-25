<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Table from '$lib/components/ui/table';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import RefreshCcw from '@lucide/svelte/icons/refresh-ccw';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import { onMount } from 'svelte';

	let { data } = $props();
	let payment = $derived(data.payment);
	let refunds = $derived(data.refunds || []);

	let refundOpen = $state(false);
	let refundAmount = $state('');
	let refundReason = $state('');
	let refunding = $state(false);

	let disputeOpen = $state(false);
	let disputeReason = $state('');
	let disputing = $state(false);

	let disputes = $state<any[]>([]);
	let loadingDisputes = $state(false);

	const statusColors: Record<string, string> = {
		pending: 'bg-warning/15 text-warning border-warning/30',
		completed: 'bg-success/15 text-success border-success/30',
		failed: 'bg-destructive/15 text-destructive border-destructive/30',
		refunded: 'bg-info/15 text-info border-info/30',
	};

	const refundStatusColors: Record<string, string> = {
		pending: 'bg-warning/15 text-warning border-warning/30',
		completed: 'bg-success/15 text-success border-success/30',
		failed: 'bg-destructive/15 text-destructive border-destructive/30',
	};

	const disputeStatusColors: Record<string, string> = {
		open: 'bg-warning/15 text-warning border-warning/30',
		resolved: 'bg-success/15 text-success border-success/30',
		rejected: 'bg-destructive/15 text-destructive border-destructive/30',
	};

	onMount(() => {
		loadDisputes();
	});

	async function loadDisputes() {
		loadingDisputes = true;
		try {
			const res = await apiFetch<{ items: any[]; total: number }>('/merchant/payments/disputes?page=1&limit=100');
			disputes = (res.items || []).filter((d: any) => d.paymentId === payment.id);
		} catch {
			disputes = [];
		} finally {
			loadingDisputes = false;
		}
	}

	async function submitRefund() {
		const amount = refundAmount.trim();
		if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
			toast.error('Please enter a valid refund amount');
			return;
		}
		if (Number(amount) > Number(payment.amount)) {
			toast.error('Refund amount cannot exceed payment amount');
			return;
		}
		if (!refundReason.trim()) {
			toast.error('Please provide a reason for the refund');
			return;
		}

		refunding = true;
		try {
			await apiFetch(`/merchant/payments/${payment.id}/refund`, {
				method: 'POST',
				body: JSON.stringify({ amount, reason: refundReason.trim() }),
			});
			toast.success('Refund issued successfully');
			refundOpen = false;
			refundAmount = '';
			refundReason = '';
			invalidateAll();
		} catch (err: any) {
			toast.error(err?.message || 'Failed to issue refund');
		} finally {
			refunding = false;
		}
	}

	async function submitDispute() {
		if (!disputeReason.trim()) {
			toast.error('Please provide a reason for the dispute');
			return;
		}

		disputing = true;
		try {
			await apiFetch('/merchant/payments/disputes', {
				method: 'POST',
				body: JSON.stringify({ paymentId: payment.id, reason: disputeReason.trim() }),
			});
			toast.success('Dispute filed successfully');
			disputeOpen = false;
			disputeReason = '';
			await loadDisputes();
			invalidateAll();
		} catch (err: any) {
			toast.error(err?.message || 'Failed to file dispute');
		} finally {
			disputing = false;
		}
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function formatPrice(p: string | number, currency?: string) {
		const symbol = currency === 'INR' ? '₹' : '$';
		return `${symbol}${Number(p).toFixed(2)}`;
	}

	const openDispute = $derived(disputes.find((d) => d.status === 'open'));
</script>

<div class="space-y-6 max-w-5xl">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="sm" href="/dashboard/payments" class="gap-2">
				<ArrowLeft class="w-4 h-4" />
				Back
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Payment Detail</h1>
				<p class="text-muted-foreground">{formatDate(payment.createdAt)}</p>
			</div>
		</div>
		<Badge class={`text-sm px-3 py-1 ${statusColors[payment.status] || ''}`}>
			{payment.status}
		</Badge>
	</div>

	<div class="grid md:grid-cols-3 gap-6">
		<!-- Main Column -->
		<div class="md:col-span-2 space-y-6">
			<!-- Payment Info -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-base">
						<CreditCard class="w-4 h-4" />
						Payment Information
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
					<div class="flex justify-between text-sm">
						<span class="text-muted-foreground">Order</span>
						<a href="/dashboard/orders/{payment.order?.id || payment.orderId}" class="font-medium hover:underline">
							#{payment.order?.orderNumber || payment.orderId}
						</a>
					</div>
					<div class="flex justify-between text-sm">
						<span class="text-muted-foreground">Provider</span>
						<span class="capitalize font-medium">{payment.provider}</span>
					</div>
					<div class="flex justify-between text-sm">
						<span class="text-muted-foreground">Amount</span>
						<span class="font-medium">{formatPrice(payment.amount, payment.currency)}</span>
					</div>
					<div class="flex justify-between text-sm">
						<span class="text-muted-foreground">Currency</span>
						<span class="uppercase font-medium">{payment.currency}</span>
					</div>
					{#if payment.providerPaymentId}
						<div class="flex justify-between text-sm">
							<span class="text-muted-foreground">Transaction ID</span>
							<span class="font-medium font-mono text-xs">{payment.providerPaymentId}</span>
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Refunds -->
			<Card>
				<CardHeader class="flex flex-row items-center justify-between">
					<CardTitle class="flex items-center gap-2 text-base">
						<RefreshCcw class="w-4 h-4" />
						Refunds ({refunds.length})
					</CardTitle>
					{#if payment.status === 'completed'}
						<Button size="sm" onclick={() => (refundOpen = true)}>Issue Refund</Button>
					{/if}
				</CardHeader>
				<CardContent class="p-0">
					{#if refunds.length === 0}
						<p class="text-sm text-muted-foreground py-6 text-center">No refunds issued yet.</p>
					{:else}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head class="text-right">Amount</Table.Head>
									<Table.Head>Reason</Table.Head>
									<Table.Head class="text-center">Status</Table.Head>
									<Table.Head>Date</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each refunds as refund (refund.id)}
									<Table.Row>
										<Table.Cell class="text-right font-medium">{formatPrice(refund.amount, payment.currency)}</Table.Cell>
										<Table.Cell class="max-w-xs truncate">{refund.reason || '—'}</Table.Cell>
										<Table.Cell class="text-center">
											<Badge class={refundStatusColors[refund.status] || ''}>{refund.status}</Badge>
										</Table.Cell>
										<Table.Cell class="text-muted-foreground whitespace-nowrap">{formatDate(refund.createdAt)}</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</CardContent>
			</Card>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Dispute -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-base">
						<AlertTriangle class="w-4 h-4" />
						Dispute
					</CardTitle>
				</CardHeader>
				<CardContent>
					{#if loadingDisputes}
						<p class="text-sm text-muted-foreground text-center">Loading...</p>
					{:else if openDispute}
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-sm text-muted-foreground">Status</span>
								<Badge class={disputeStatusColors[openDispute.status] || ''}>{openDispute.status}</Badge>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-muted-foreground">Filed</span>
								<span class="text-sm">{formatDate(openDispute.createdAt)}</span>
							</div>
							{#if openDispute.reason}
								<div>
									<span class="text-sm text-muted-foreground">Reason</span>
									<p class="text-sm mt-1">{openDispute.reason}</p>
								</div>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground mb-4">No open dispute for this payment.</p>
						<Button size="sm" variant="outline" class="w-full" onclick={() => (disputeOpen = true)}>
							File Dispute
						</Button>
					{/if}
				</CardContent>
			</Card>
		</div>
	</div>
</div>

<!-- Issue Refund Dialog -->
<Dialog.Root bind:open={refundOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Issue Refund</Dialog.Title>
			<Dialog.Description>
				Refund for payment #{payment.order?.orderNumber || payment.orderId}
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-2">
			<div class="space-y-2">
				<Label for="refund-amount">Refund Amount</Label>
				<Input
					id="refund-amount"
					type="number"
					step="0.01"
					min="0.01"
					max={Number(payment.amount)}
					bind:value={refundAmount}
					placeholder="Max {formatPrice(payment.amount, payment.currency)}"
				/>
				<p class="text-xs text-muted-foreground">Maximum refund: {formatPrice(payment.amount, payment.currency)}</p>
			</div>
			<div class="space-y-2">
				<Label for="refund-reason">Reason</Label>
				<Textarea id="refund-reason" bind:value={refundReason} rows={3} placeholder="Customer request, product issue, etc." />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (refundOpen = false)}>Cancel</Button>
			<Button onclick={submitRefund} disabled={refunding}>
				{refunding ? 'Processing...' : 'Issue Refund'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- File Dispute Dialog -->
<Dialog.Root bind:open={disputeOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>File Dispute</Dialog.Title>
			<Dialog.Description>
				Open a dispute for payment #{payment.order?.orderNumber || payment.orderId}
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-2">
			<div class="space-y-2">
				<Label for="dispute-reason">Reason</Label>
				<Textarea id="dispute-reason" bind:value={disputeReason} rows={4} placeholder="Describe the reason for this dispute..." />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (disputeOpen = false)}>Cancel</Button>
			<Button onclick={submitDispute} disabled={disputing}>
				{disputing ? 'Filing...' : 'File Dispute'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
