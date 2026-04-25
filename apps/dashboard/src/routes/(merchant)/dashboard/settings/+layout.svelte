<script lang="ts">
	import { page } from '$app/state';
	import Settings from '@lucide/svelte/icons/settings';
	import Palette from '@lucide/svelte/icons/palette';
	import Monitor from '@lucide/svelte/icons/monitor';
	import UserCog from '@lucide/svelte/icons/user-cog';
	import Truck from '@lucide/svelte/icons/truck';
	import Receipt from '@lucide/svelte/icons/receipt';
	import { hasPermission } from '$lib/permissions';

	let { data, children } = $props();

	const tabs = [
		{ label: 'General', href: '/dashboard/settings/general', icon: Settings, permission: 'store:read' },
		{ label: 'Branding', href: '/dashboard/settings/branding', icon: Palette, permission: 'store:write' },
		{ label: 'Storefront', href: '/dashboard/settings/storefront', icon: Monitor, permission: 'store:write' },
		{ label: 'Staff', href: '/dashboard/settings/staff', icon: UserCog, permission: 'staff:write' },
		{ label: 'Shipping', href: '/dashboard/settings/shipping', icon: Truck, permission: 'shipping:write' },
		{ label: 'Tax', href: '/dashboard/settings/tax', icon: Receipt, permission: 'tax:write' },
	];

	const visibleTabs = $derived(
		tabs.filter((t) => hasPermission(data.userPermissions, t.permission))
	);

	function isActive(href: string) {
		return page.url.pathname === href;
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Settings</h1>
		<p class="text-muted-foreground">Manage your store configuration</p>
	</div>

	<nav class="flex gap-1 overflow-x-auto pb-1 border-b">
		{#each visibleTabs as tab}
			<a
				href={tab.href}
				class="flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm whitespace-nowrap transition-colors
					{isActive(tab.href)
						? 'bg-background text-foreground border border-b-transparent font-medium -mb-px'
						: 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
			>
				<svelte:component this={tab.icon} class="w-4 h-4" />
				{tab.label}
			</a>
		{/each}
	</nav>

	{@render children()}
</div>
