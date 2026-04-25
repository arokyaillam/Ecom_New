import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const status = url.searchParams.get('status') || '';
	const search = url.searchParams.get('search') || '';

	const params = new URLSearchParams({ page, limit: '20' });
	if (status) params.set('status', status);
	if (search) params.set('search', search);

	try {
		const res = await apiFetch(`/api/v1/merchant/payments?${params}`, {
			headers: { Cookie: cookie },
		});
		const data = res.ok ? await res.json() : { items: [], total: 0 };
		return { payments: data, status, search };
	} catch {
		return { payments: { items: [], total: 0 }, status, search };
	}
};
