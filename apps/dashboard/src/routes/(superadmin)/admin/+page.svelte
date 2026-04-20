<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';

	let { data } = $props();
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Platform Administration</h1>
		<p class="text-muted-foreground">Overview of platform-wide metrics and activity.</p>
	</div>

	<!-- Stat card placeholders -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total Merchants</CardTitle>
			</CardHeader>
			<CardContent>
				<Skeleton class="h-8 w-16" />
				<Skeleton class="h-4 w-24 mt-2" />
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Active Stores</CardTitle>
			</CardHeader>
			<CardContent>
				<Skeleton class="h-8 w-16" />
				<Skeleton class="h-4 w-24 mt-2" />
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total Revenue</CardTitle>
			</CardHeader>
			<CardContent>
				<Skeleton class="h-8 w-24" />
				<Skeleton class="h-4 w-32 mt-2" />
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Active Subscriptions</CardTitle>
			</CardHeader>
			<CardContent>
				<Skeleton class="h-8 w-16" />
				<Skeleton class="h-4 w-24 mt-2" />
			</CardContent>
		</Card>
	</div>

	<!-- Recent activity placeholder -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
		<Card class="col-span-4">
			<CardHeader>
				<CardTitle>Recent Merchant Signups</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-3">
					{#each Array(5) as _}
						<div class="flex items-center gap-4">
							<Skeleton class="h-10 w-10 rounded-full" />
							<div class="flex-1 space-y-1">
								<Skeleton class="h-4 w-48" />
								<Skeleton class="h-3 w-24" />
							</div>
							<Skeleton class="h-4 w-16" />
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>

		<Card class="col-span-3">
			<CardHeader>
				<CardTitle>Plan Distribution</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-3">
					{#each Array(4) as _}
						<div class="space-y-1">
							<Skeleton class="h-4 w-36" />
							<Skeleton class="h-2 w-full" />
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	</div>
</div>