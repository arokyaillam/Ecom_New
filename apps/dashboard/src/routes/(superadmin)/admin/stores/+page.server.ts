import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const params = new URLSearchParams({ page, limit: '20' });

	try {
		const res = await apiFetch(`/api/v1/admin/stores?${params}`, { headers: { Cookie: cookie } });
		const data = res.ok ? await res.json() : { stores: [], total: 0 };
		return { stores: data };
	} catch {
		return { stores: { stores: [], total: 0 } };
	}
};
