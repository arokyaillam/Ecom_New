<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import { hasPermission } from '$lib/permissions';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Image from '@lucide/svelte/icons/image';

	let { data } = $props();
	let showDialog = $state(false);
	let editingBanner = $state<any>(null);
	let saving = $state(false);
	let canWrite = $derived(hasPermission(data.userPermissions, 'store:write'));

	let form = $state({
		title: '',
		subtitle: '',
		imageUrl: '',
		linkUrl: '',
		position: 'homepage_hero',
		sortOrder: 0,
		isActive: true,
		startDate: '',
		endDate: '',
	});

	function openCreate() {
		editingBanner = null;
		form = { title: '', subtitle: '', imageUrl: '', linkUrl: '', position: 'homepage_hero', sortOrder: 0, isActive: true, startDate: '', endDate: '' };
		showDialog = true;
	}

	function openEdit(b: any) {
		editingBanner = b;
		form = {
			title: b.title || '',
			subtitle: b.subtitle || '',
			imageUrl: b.imageUrl || '',
			linkUrl: b.linkUrl || '',
			position: b.position || 'homepage_hero',
			sortOrder: b.sortOrder ?? 0,
			isActive: b.isActive ?? true,
			startDate: b.startDate ? new Date(b.startDate).toISOString().split('T')[0] : '',
			endDate: b.endDate ? new Date(b.endDate).toISOString().split('T')[0] : '',
		};
		showDialog = true;
	}

	async function handleSave() {
		if (!form.title) { toast.error('Title is required'); return; }
		saving = true;
		try {
			const payload: Record<string, any> = {
				title: form.title,
				subtitle: form.subtitle || undefined,
				imageUrl: form.imageUrl || undefined,
				linkUrl: form.linkUrl || undefined,
				position: form.position,
				sortOrder: Number(form.sortOrder) || 0,
				isActive: form.isActive,
			};
			if (form.startDate) payload.startDate = new Date(form.startDate).toISOString();
			if (form.endDate) payload.endDate = new Date(form.endDate).toISOString();

			if (editingBanner) {
				await apiFetch(`/merchant/marketing/banners/${editingBanner.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
				toast.success('Banner updated');
			} else {
				await apiFetch('/merchant/marketing/banners', { method: 'POST', body: JSON.stringify(payload) });
				toast.success('Banner created');
			}
			showDialog = false;
			invalidateAll();
		} catch (err: any) { toast.error(err?.message || 'Failed to save'); }
		finally { saving = false; }
	}

	async function deleteBanner(id: string) {
		if (!confirm('Delete this banner?')) return;
		try { await apiFetch(`/merchant/marketing/banners/${id}`, { method: 'DELETE' }); toast.success('Deleted'); invalidateAll(); }
		catch { toast.error('Failed to delete'); }
	}

	async function moveBanner(index: number, direction: 'up' | 'down') {
		if (!data.banners || data.banners.length < 2) return;
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= data.banners.length) return;

		const reordered = [...data.banners];
		const temp = reordered[index];
		reordered[index] = reordered[newIndex];
		reordered[newIndex] = temp;

		const ids = reordered.map((b: any) => b.id);
		try {
			await apiFetch('/merchant/marketing/banners/reorder', { method: 'POST', body: JSON.stringify({ ids }) });
			toast.success('Order updated');
			invalidateAll();
		} catch { toast.error('Failed to reorder'); }
	}

	function formatDate(d: string) {
		return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
	}

	function isExpired(endDate: string) {
		return endDate && new Date(endDate) < new Date();
	}

	function positionLabel(p: string) {
		const labels: Record<string, string> = {
			homepage_hero: 'Homepage Hero',
			homepage_featured: 'Homepage Featured',
			homepage_promo: 'Homepage Promo',
			product_page: 'Product Page',
			cart_page: 'Cart Page',
		};
		return labels[p] || p;
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Marketing</h1>
			<p class="text-muted-foreground">Manage banners and promotions</p>
		</div>
		{#if canWrite}
			<Button onclick={openCreate} class="gap-2"><Plus class="w-4 h-4" />Add Banner</Button>
		{/if}
	</div>

	<Card>
		<CardHeader>
			<CardTitle>Banners</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if !data.banners || data.banners.length === 0}
				<div class="py-16 text-center text-muted-foreground">
					<Megaphone class="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p class="text-lg font-medium">No banners yet</p>
					<p class="text-sm">Create banners to promote products and offers on your storefront.</p>
					{#if canWrite}
						<Button onclick={openCreate} class="mt-4 gap-2"><Plus class="w-4 h-4" />Add Banner</Button>
					{/if}
				</div>
			{:else}
				<div class="divide-y">
					{#each data.banners as banner, i (banner.id)}
						<div class="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
							<div class="w-20 h-14 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
								{#if banner.imageUrl}
									<img src={banner.imageUrl} alt={banner.title} class="w-full h-full object-cover" />
								{:else}
									<Image class="w-6 h-6 text-muted-foreground" />
								{/if}
							</div>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<p class="font-medium text-sm truncate">{banner.title}</p>
									{#if !banner.isActive}
										<Badge variant="secondary">Inactive</Badge>
									{:else if isExpired(banner.endDate)}
										<Badge class="bg-destructive/15 text-destructive border-destructive/30">Expired</Badge>
									{:else}
										<Badge class="bg-success/15 text-success border-success/30">Active</Badge>
									{/if}
								</div>
								<p class="text-xs text-muted-foreground mt-0.5">{positionLabel(banner.position)} · Order {banner.sortOrder ?? 0}</p>
								{#if banner.subtitle}
									<p class="text-xs text-muted-foreground truncate mt-0.5">{banner.subtitle}</p>
								{/if}
								{#if banner.startDate || banner.endDate}
									<p class="text-xs text-muted-foreground mt-0.5">
										{banner.startDate ? formatDate(banner.startDate) : '—'} → {banner.endDate ? formatDate(banner.endDate) : '—'}
									</p>
								{/if}
							</div>
							<div class="flex items-center gap-1 shrink-0">
								{#if canWrite}
									<button onclick={() => moveBanner(i, 'up')} disabled={i === 0} class="p-1.5 rounded hover:bg-muted disabled:opacity-30" aria-label="Move up"><ArrowUp class="w-4 h-4 text-muted-foreground" /></button>
									<button onclick={() => moveBanner(i, 'down')} disabled={i === data.banners.length - 1} class="p-1.5 rounded hover:bg-muted disabled:opacity-30" aria-label="Move down"><ArrowDown class="w-4 h-4 text-muted-foreground" /></button>
									<button onclick={() => openEdit(banner)} class="p-1.5 rounded hover:bg-muted"><Pencil class="w-4 h-4 text-muted-foreground" /></button>
									<button onclick={() => deleteBanner(banner.id)} class="p-1.5 rounded hover:bg-destructive/10"><Trash2 class="w-4 h-4 text-destructive" /></button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>
</div>

<Dialog.Root bind:open={showDialog}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{editingBanner ? 'Edit Banner' : 'Add Banner'}</Dialog.Title>
		</Dialog.Header>
		<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
			<div class="space-y-2">
				<Label for="bannerTitle">Title *</Label>
				<Input id="bannerTitle" bind:value={form.title} placeholder="Summer Sale" required />
			</div>
			<div class="space-y-2">
				<Label for="bannerSubtitle">Subtitle</Label>
				<Input id="bannerSubtitle" bind:value={form.subtitle} placeholder="Up to 50% off selected items" />
			</div>
			<div class="space-y-2">
				<Label for="bannerImageUrl">Image URL</Label>
				<Input id="bannerImageUrl" type="url" bind:value={form.imageUrl} placeholder="https://example.com/banner.jpg" />
			</div>
			<div class="space-y-2">
				<Label for="bannerLinkUrl">Link URL</Label>
				<Input id="bannerLinkUrl" type="url" bind:value={form.linkUrl} placeholder="https://example.com/sale" />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label>Position</Label>
					<Select.Root type="single" value={form.position} onValueChange={(v) => form.position = v}>
						<Select.Trigger class="w-full">{#snippet children()}{positionLabel(form.position)}{/snippet}</Select.Trigger>
						<Select.Content>
							<Select.Item value="homepage_hero">Homepage Hero</Select.Item>
							<Select.Item value="homepage_featured">Homepage Featured</Select.Item>
							<Select.Item value="homepage_promo">Homepage Promo</Select.Item>
							<Select.Item value="product_page">Product Page</Select.Item>
							<Select.Item value="cart_page">Cart Page</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label for="bannerSortOrder">Sort Order</Label>
					<Input id="bannerSortOrder" type="number" bind:value={form.sortOrder} />
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2"><Label for="startDate">Start Date</Label><Input id="startDate" type="date" bind:value={form.startDate} /></div>
				<div class="space-y-2"><Label for="endDate">End Date</Label><Input id="endDate" type="date" bind:value={form.endDate} /></div>
			</div>
			<div class="flex items-center justify-between">
				<Label>Active</Label>
				<Switch bind:checked={form.isActive} />
			</div>
			<div class="flex justify-end gap-3 pt-2">
				<Button variant="outline" type="button" onclick={() => showDialog = false}>Cancel</Button>
				<Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingBanner ? 'Update' : 'Create'}</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
