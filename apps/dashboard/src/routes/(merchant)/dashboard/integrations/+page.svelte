<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Truck from '@lucide/svelte/icons/truck';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Target from '@lucide/svelte/icons/target';
	import Plug from '@lucide/svelte/icons/plug';

	let { data } = $props();

	type IntegrationConfig = Record<string, string>;
	interface IntegrationState {
		enabled: boolean;
		config: IntegrationConfig;
		saving: boolean;
	}

	const providerMeta = [
		{
			key: 'razorpay' as const,
			title: 'Razorpay',
			description: 'Accept payments via Razorpay',
			icon: CreditCard,
			fields: [
				{ key: 'apiKey', label: 'API Key' },
				{ key: 'secretKey', label: 'Secret Key' },
			],
		},
		{
			key: 'stripe' as const,
			title: 'Stripe',
			description: 'Accept payments via Stripe',
			icon: CreditCard,
			fields: [
				{ key: 'publishableKey', label: 'Publishable Key' },
				{ key: 'secretKey', label: 'Secret Key' },
			],
		},
		{
			key: 'whatsapp' as const,
			title: 'WhatsApp Business',
			description: 'Send order updates via WhatsApp',
			icon: Smartphone,
			fields: [
				{ key: 'phoneNumber', label: 'Phone Number' },
				{ key: 'apiKey', label: 'API Key' },
			],
		},
		{
			key: 'shiprocket' as const,
			title: 'Shiprocket',
			description: 'Manage shipping with Shiprocket',
			icon: Truck,
			fields: [
				{ key: 'apiKey', label: 'API Key' },
				{ key: 'email', label: 'Email' },
			],
		},
		{
			key: 'googleAnalytics' as const,
			title: 'Google Analytics',
			description: 'Track visitors with Google Analytics',
			icon: BarChart3,
			fields: [{ key: 'trackingId', label: 'Tracking ID' }],
		},
		{
			key: 'metaPixel' as const,
			title: 'Meta Pixel',
			description: 'Track conversions with Meta Pixel',
			icon: Target,
			fields: [{ key: 'pixelId', label: 'Pixel ID' }],
		},
	];

	function buildInitialState(): Record<string, IntegrationState> {
		const state: Record<string, IntegrationState> = {};
		for (const p of providerMeta) {
			const existing = data.integrations?.[p.key] as IntegrationState | undefined;
			state[p.key] = {
				enabled: existing?.enabled ?? false,
				config: { ...(existing?.config ?? {}) },
				saving: false,
			};
		}
		return state;
	}

	let integrations = $state(buildInitialState());

	async function saveProvider(key: string) {
		const item = integrations[key];
		if (!item) return;
		item.saving = true;
		try {
			await apiFetch('/merchant/store/integrations', {
				method: 'PATCH',
				body: JSON.stringify({
					provider: key,
					enabled: item.enabled,
					config: item.enabled ? item.config : undefined,
				}),
			});
			toast.success(`${providerMeta.find((p) => p.key === key)?.title ?? key} saved`);
		} catch (err: any) {
			toast.error(err?.message || `Failed to save ${key}`);
		} finally {
			item.saving = false;
		}
	}
</script>

<svelte:head>
	<title>Integrations — StoreDash</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight flex items-center gap-2">
			<Plug class="w-6 h-6" />
			Integrations
		</h1>
		<p class="text-muted-foreground">Connect your store with third-party services</p>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		{#each providerMeta as provider}
			<Card>
				<CardHeader>
					<div class="flex items-start justify-between">
						<div class="flex items-center gap-3">
							<div class="p-2 rounded-lg bg-primary/10 text-primary">
								<provider.icon class="w-5 h-5" />
							</div>
							<div>
								<CardTitle class="text-base">{provider.title}</CardTitle>
								<CardDescription>{provider.description}</CardDescription>
							</div>
						</div>
						<Switch
							checked={integrations[provider.key].enabled}
							onCheckedChange={(v: boolean) => {
								integrations[provider.key].enabled = v;
							}}
						/>
					</div>
				</CardHeader>
				<CardContent class="space-y-4">
					{#if integrations[provider.key].enabled}
						<div class="space-y-3">
							{#each provider.fields as field}
								<div class="space-y-1.5">
									<Label for="{provider.key}-{field.key}">{field.label}</Label>
									<Input
										id="{provider.key}-{field.key}"
										type="text"
										placeholder={field.label}
										bind:value={integrations[provider.key].config[field.key]}
									/>
								</div>
							{/each}
						</div>
						<div class="flex justify-end">
							<Button
								size="sm"
								disabled={integrations[provider.key].saving}
								onclick={() => saveProvider(provider.key)}
							>
								{integrations[provider.key].saving ? 'Saving...' : 'Save'}
							</Button>
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">Enable this integration to configure settings.</p>
					{/if}
				</CardContent>
			</Card>
		{/each}
	</div>
</div>
