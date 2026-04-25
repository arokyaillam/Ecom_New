<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert';
	import { apiFetch } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import Save from '@lucide/svelte/icons/save';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import Globe from '@lucide/svelte/icons/globe';
	import Copy from '@lucide/svelte/icons/copy';
	import CheckCircle from '@lucide/svelte/icons/check-circle';

	let { data } = $props();
	let saving = $state(false);
	let verifying = $state(false);
	let customDomain = $state(data.domain?.customDomain || '');
	let verified = $state(data.domain?.customDomainVerified || false);
	let verifiedAt = $state(data.domain?.customDomainVerifiedAt || null);

	const subdomain = data.domain?.subdomain || '';

	async function handleSave() {
		saving = true;
		try {
			const res = await apiFetch<{
				customDomain: string | null;
				customDomainVerified: boolean;
				customDomainVerifiedAt: string | null;
			}>('/merchant/store/domain', {
				method: 'PATCH',
				body: JSON.stringify({ customDomain: customDomain.trim() || null }),
			});
			if (res.customDomain) {
				customDomain = res.customDomain;
				verified = res.customDomainVerified;
				verifiedAt = res.customDomainVerifiedAt;
			}
			toast.success('Custom domain saved');
			invalidateAll();
		} catch (err: any) {
			toast.error(err?.message || 'Failed to save custom domain');
		} finally {
			saving = false;
		}
	}

	async function handleVerify() {
		verifying = true;
		try {
			const res = await apiFetch<{
				customDomainVerified: boolean;
				customDomainVerifiedAt: string | null;
			}>('/merchant/store/domain/verify', {
				method: 'POST',
			});
			verified = res.customDomainVerified;
			verifiedAt = res.customDomainVerifiedAt;
			toast.success('Domain verified successfully');
			invalidateAll();
		} catch (err: any) {
			toast.error(err?.message || 'Domain verification failed');
		} finally {
			verifying = false;
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		toast.success('Copied to clipboard');
	}

	const dnsName = $derived(customDomain.split('.')[0] || 'shop');
	const dnsValue = $derived(`${subdomain}.yourplatform.com`);
</script>

<div class="space-y-6 max-w-2xl">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Domain Settings</h1>
		<p class="text-muted-foreground">Configure your store's custom domain</p>
	</div>

	<!-- Subdomain Card -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Globe class="w-5 h-5" />
				Subdomain
			</CardTitle>
			<CardDescription>Your default platform subdomain</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="space-y-2">
				<Label for="subdomain">Subdomain</Label>
				<Input id="subdomain" value={subdomain} readonly class="bg-muted" />
			</div>
			<p class="text-sm text-muted-foreground">
				Your store is accessible at <span class="font-mono text-foreground">{subdomain}.yourplatform.com</span>
			</p>
		</CardContent>
	</Card>

	<!-- Custom Domain Card -->
	<Card>
		<CardHeader>
			<CardTitle>Custom Domain</CardTitle>
			<CardDescription>Connect your own domain to your store</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="space-y-2">
				<Label for="customDomain">Custom Domain</Label>
				<Input
					id="customDomain"
					bind:value={customDomain}
					placeholder="shop.example.com"
				/>
			</div>

			{#if customDomain}
				<div class="flex items-center gap-2">
					{#if verified}
						<Badge variant="default" class="gap-1">
							<ShieldCheck class="w-3 h-3" />
							Verified
						</Badge>
						{#if verifiedAt}
							<span class="text-xs text-muted-foreground">
								Verified at {new Date(verifiedAt).toLocaleString()}
							</span>
						{/if}
					{:else}
						<Badge variant="destructive" class="gap-1">
							<ShieldAlert class="w-3 h-3" />
							Not Verified
						</Badge>
					{/if}
				</div>
			{/if}

			<div class="flex gap-2">
				<Button type="button" onclick={handleSave} disabled={saving} class="gap-2">
					<Save class="w-4 h-4" />
					{saving ? 'Saving...' : 'Save Domain'}
				</Button>
				{#if customDomain && !verified}
					<Button type="button" variant="outline" onclick={handleVerify} disabled={verifying}>
						{verifying ? 'Verifying...' : 'Verify Domain'}
					</Button>
				{/if}
			</div>

			{#if customDomain}
				<Alert>
					<AlertTitle>DNS Instructions</AlertTitle>
					<AlertDescription class="space-y-3 mt-2">
						<p class="text-sm">Add a CNAME record in your DNS provider:</p>
						<div class="grid grid-cols-[1fr_auto] gap-2 text-sm">
							<div>
								<span class="text-muted-foreground">Name:</span>
								<code class="ml-1 font-mono bg-muted px-1 rounded">{dnsName}</code>
								<span class="text-xs text-muted-foreground ml-1">(or @ for root)</span>
							</div>
							<Button variant="ghost" size="sm" class="h-6 px-2" onclick={() => copyToClipboard(dnsName)}>
								<Copy class="w-3 h-3" />
							</Button>
						</div>
						<div class="grid grid-cols-[1fr_auto] gap-2 text-sm">
							<div>
								<span class="text-muted-foreground">Value:</span>
								<code class="ml-1 font-mono bg-muted px-1 rounded">{dnsValue}</code>
							</div>
							<Button variant="ghost" size="sm" class="h-6 px-2" onclick={() => copyToClipboard(dnsValue)}>
								<Copy class="w-3 h-3" />
							</Button>
						</div>
					</AlertDescription>
				</Alert>

				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<CheckCircle class="w-4 h-4 text-green-500" />
					SSL Active
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
