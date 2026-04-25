import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const isRead = url.searchParams.get('isRead') || '';

	const params = new URLSearchParams({ page, limit: '20' });
	if (isRead === 'true') params.set('isRead', 'true');
	if (isRead === 'false') params.set('isRead', 'false');

	try {
		const res = await apiFetch(`/api/v1/merchant/notifications?${params}`, {
			headers: { Cookie: cookie },
		});
		const data = res.ok ? await res.json() : { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
		return { notifications: data, isRead };
	} catch {
		return { notifications: { items: [], total: 0, page: 1, limit: 20, totalPages: 0 }, isRead };
	}
};
