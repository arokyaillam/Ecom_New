<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		// Redirect root to dashboard (auth guard will redirect to /login if needed)
		goto('/dashboard', { replaceState: true });
	});
</script>

<div class="min-h-screen flex items-center justify-center">
	<p class="text-muted-foreground">Redirecting...</p>
</div>