<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner';

	let { children } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-background">
	{@render children()}
	<Toaster />
</div>