import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;

	try {
		const [statsRes, recentOrdersRes, lowStockRes] = await Promise.all([
			apiFetch(`/api/v1/merchant/analytics/overview`, { headers: { Cookie: cookie } }),
			apiFetch(`/api/v1/merchant/orders?page=1&limit=5`, { headers: { Cookie: cookie } }),
			apiFetch(`/api/v1/merchant/inventory?filter=lowStock&limit=1`, { headers: { Cookie: cookie } }),
		]);

		const stats = statsRes.ok ? await statsRes.json() : null;
		const recentOrders = recentOrdersRes.ok ? await recentOrdersRes.json() : { orders: [] };
		const lowStock = lowStockRes.ok ? await lowStockRes.json() : { total: 0 };

		return {
			stats,
			recentOrders: recentOrders.orders || [],
			lowStockCount: lowStock.total ?? 0,
		};
	} catch {
		return { stats: null, recentOrders: [], lowStockCount: 0 };
	}
};
