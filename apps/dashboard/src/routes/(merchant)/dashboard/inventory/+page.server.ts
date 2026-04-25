import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const filter = url.searchParams.get('filter') || 'all';
	const search = url.searchParams.get('search') || '';

	const params = new URLSearchParams({ page, limit: '20' });
	if (filter && filter !== 'all') params.set('filter', filter);
	if (search) params.set('search', search);

	try {
		const res = await apiFetch(`/api/v1/merchant/inventory?${params}`, {
			headers: { Cookie: cookie },
		});
		const inventory = res.ok ? await res.json() : { items: [], total: 0 };
		return { inventory, filter, search };
	} catch {
		return { inventory: { items: [], total: 0 }, filter, search };
	}
};
