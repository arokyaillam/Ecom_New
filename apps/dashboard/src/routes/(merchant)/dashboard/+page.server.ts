import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;

	try {
		const [statsRes, recentOrdersRes] = await Promise.all([
			apiFetch(`/api/v1/merchant/analytics/overview`, { headers: { Cookie: cookie } }),
			apiFetch(`/api/v1/merchant/orders?page=1&limit=5`, { headers: { Cookie: cookie } }),
		]);

		const stats = statsRes.ok ? await statsRes.json() : null;
		const recentOrders = recentOrdersRes.ok ? await recentOrdersRes.json() : { orders: [] };

		return {
			stats,
			recentOrders: recentOrders.orders || [],
		};
	} catch {
		return { stats: null, recentOrders: [] };
	}
};
