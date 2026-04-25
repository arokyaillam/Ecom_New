<script lang="ts">
	import Menu from '@lucide/svelte/icons/menu';
	import LogOut from '@lucide/svelte/icons/log-out';
	import User from '@lucide/svelte/icons/user';
	import Bell from '@lucide/svelte/icons/bell';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuLabel,
		DropdownMenuSeparator,
		DropdownMenuTrigger,
	} from '$lib/components/ui/dropdown-menu';
	import { apiFetch } from '$lib/api/client';
	import { goto } from '$app/navigation';

	interface Props {
		user: {
			superAdminId: string;
			role: string;
		};
		onmenuclick?: () => void;
	}

	let { user, onmenuclick }: Props = $props();

	let unreadCount = $state(0);

	function getInitials(): string {
		return 'A';
	}

	async function fetchUnreadCount() {
		try {
			const res = await apiFetch<{ count: number }>('/api/v1/merchant/notifications/unread-count');
			unreadCount = res.count ?? 0;
		} catch {
			unreadCount = 0;
		}
	}

	$effect(() => {
		fetchUnreadCount();
		const interval = setInterval(fetchUnreadCount, 30000);
		return () => clearInterval(interval);
	});
</script>

<header class="h-16 bg-card border-b flex items-center px-4 lg:px-6 shrink-0">
	<!-- Mobile hamburger -->
	<button
		class="lg:hidden p-2 rounded-md hover:bg-accent mr-2"
		onclick={onmenuclick}
		aria-label="Open menu"
	>
		<Menu class="w-5 h-5" />
	</button>

	<!-- Spacer -->
	<div class="flex-1"></div>

	<!-- Notifications -->
	<button
		class="relative p-2 rounded-md hover:bg-accent mr-2"
		onclick={() => goto('/dashboard/notifications')}
		aria-label="Notifications"
	>
		<Bell class="w-5 h-5" />
		{#if unreadCount > 0}
			<span class="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
				{unreadCount > 99 ? '99+' : unreadCount}
			</span>
		{/if}
	</button>

	<!-- User dropdown -->
	<DropdownMenu>
		<DropdownMenuTrigger class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent outline-none">
			<Avatar class="h-8 w-8">
				<AvatarFallback class="bg-primary text-primary-foreground text-xs font-medium">
					{getInitials()}
				</AvatarFallback>
			</Avatar>
			<span class="hidden sm:block text-sm font-medium">Admin</span>
		</DropdownMenuTrigger>
		<DropdownMenuContent align="end" class="w-56">
			<DropdownMenuLabel>
				<div class="flex flex-col">
					<span class="text-sm font-medium">Admin</span>
					<span class="text-xs text-muted-foreground capitalize">{user.role}</span>
				</div>
			</DropdownMenuLabel>
			<DropdownMenuSeparator />
			<DropdownMenuItem
				class="text-destructive focus:text-destructive"
				onSelect={() => {
					document.querySelector<HTMLFormElement>('#admin-logout-form')?.requestSubmit();
				}}
			>
				<LogOut class="w-4 h-4 mr-2" />
				Sign out
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
</header>
