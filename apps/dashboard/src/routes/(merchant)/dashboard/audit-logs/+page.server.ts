import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const action = url.searchParams.get('action') || '';
	const entityType = url.searchParams.get('entityType') || '';
	const userId = url.searchParams.get('userId') || '';
	const startDate = url.searchParams.get('startDate') || '';
	const endDate = url.searchParams.get('endDate') || '';

	const params = new URLSearchParams({ page, limit: '20' });
	if (action) params.set('action', action);
	if (entityType) params.set('entityType', entityType);
	if (userId) params.set('userId', userId);
	if (startDate) params.set('startDate', startDate);
	if (endDate) params.set('endDate', endDate);

	try {
		const res = await apiFetch(`/api/v1/merchant/audit-logs?${params}`, {
			headers: { Cookie: cookie },
		});
		const data = res.ok ? await res.json() : { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
		return { auditLogs: data, action, entityType, userId, startDate, endDate };
	} catch {
		return { auditLogs: { items: [], total: 0, page: 1, limit: 20, totalPages: 0 }, action, entityType, userId, startDate, endDate };
	}
};
