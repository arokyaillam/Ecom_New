<script lang="ts">
	import { page } from '$app/state';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Building2 from '@lucide/svelte/icons/building-2';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Store from '@lucide/svelte/icons/store';
	import LogOut from '@lucide/svelte/icons/log-out';
	import X from '@lucide/svelte/icons/x';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { Separator } from '$lib/components/ui/separator';

	interface NavItem {
		label: string;
		href: string;
		icon: typeof LayoutDashboard;
	}

	interface Props {
		user: {
			superAdminId: string;
			role: string;
		};
		open?: boolean;
		onclose?: () => void;
	}

	let { user, open = $bindable(false), onclose }: Props = $props();

	const navItems: NavItem[] = [
		{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
		{ label: 'Merchants', href: '/admin/merchants', icon: Building2 },
		{ label: 'Plans', href: '/admin/plans', icon: CreditCard },
		{ label: 'Stores', href: '/admin/stores', icon: Store },
	];

	function isActive(href: string): boolean {
		const current = page.url.pathname;
		if (href === '/admin') return current === '/admin';
		return current.startsWith(href);
	}

	function getInitials(): string {
		return 'A';
	}

	function handleLogout() {
		document.querySelector<HTMLFormElement>('#admin-logout-form')?.requestSubmit();
	}
</script>

<!-- Mobile overlay -->
{#if open}
	<div
		class="fixed inset-0 bg-black/50 z-40 lg:hidden"
		role="presentation"
		onclick={() => {
			open = false;
			onclose?.();
		}}
	></div>
{/if}

<aside
	class="fixed lg:static inset-y-0 left-0 z-50
		w-64 bg-sidebar text-sidebar-foreground flex flex-col
		transform transition-transform duration-200 ease-in-out
		{open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}"
>
	<!-- Brand -->
	<div class="h-16 flex items-center px-6">
		<a href="/admin" class="flex items-center gap-2 text-lg font-bold text-white">
			<svg class="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M12 2L2 7l10 5 10-5-10-5z" />
				<path d="M2 17l10 5 10-5" />
				<path d="M2 12l10 5 10-5" />
			</svg>
			Platform Admin
		</a>
		<!-- Mobile close button -->
		<button
			class="ml-auto lg:hidden p-1 rounded hover:bg-sidebar-hover"
			onclick={() => {
				open = false;
				onclose?.();
			}}
			aria-label="Close sidebar"
		>
			<X class="w-5 h-5" />
		</button>
	</div>

	<Separator class="bg-white/10" />

	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
		{#each navItems as item}
			<a
				href={item.href}
				class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
					{isActive(item.href) ? 'bg-sidebar-active/10 text-sidebar-active font-medium' : 'text-sidebar-foreground hover:bg-sidebar-hover'}"
			>
				<svelte:component this={item.icon} class="w-5 h-5 shrink-0" />
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>

	<!-- User section -->
	<Separator class="bg-white/10" />
	<div class="p-4 flex items-center gap-3">
		<Avatar class="h-9 w-9">
			<AvatarFallback class="bg-primary text-primary-foreground text-sm font-medium">
				{getInitials()}
			</AvatarFallback>
		</Avatar>
		<div class="flex-1 min-w-0">
			<p class="text-sm font-medium truncate">Admin</p>
			<p class="text-xs text-sidebar-foreground/60 capitalize">{user.role}</p>
		</div>
		<form id="admin-logout-form" method="POST" action="/admin/logout" class="hidden"></form>
		<button
			onclick={handleLogout}
			class="p-1.5 rounded hover:bg-sidebar-hover text-sidebar-foreground/60 hover:text-sidebar-foreground"
			aria-label="Sign out"
		>
			<LogOut class="w-4 h-4" />
		</button>
	</div>
</aside>