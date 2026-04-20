<script lang="ts">
	import AdminSidebar from '$lib/components/layout/AdminSidebar.svelte';
	import AdminTopbar from '$lib/components/layout/AdminTopbar.svelte';
	import { Toaster } from '$lib/components/ui/sonner';

	let { data, children } = $props();

	let sidebarOpen = $state(false);
</script>

<div class="flex h-screen overflow-hidden">
	<AdminSidebar user={data.user} bind:open={sidebarOpen} />
	<div class="flex-1 flex flex-col overflow-hidden">
		<AdminTopbar user={data.user} onmenuclick={() => (sidebarOpen = true)} />
		<main class="flex-1 overflow-y-auto p-6 bg-background">
			{@render children()}
		</main>
	</div>
	<Toaster />
</div>