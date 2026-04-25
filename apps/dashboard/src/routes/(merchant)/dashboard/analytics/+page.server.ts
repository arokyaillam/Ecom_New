import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

function getDateRange(range: string) {
	const end = new Date();
	const start = new Date();
	switch (range) {
		case '7d':
			start.setDate(start.getDate() - 7);
			break;
		case '90d':
			start.setDate(start.getDate() - 90);
			break;
		case 'year':
			start.setMonth(0, 1);
			break;
		default:
			start.setDate(start.getDate() - 30);
	}
	return { start, end };
}

export const load: PageServerLoad = async ({ url, cookies }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const range = url.searchParams.get('range') || '30d';
	const { start, end } = getDateRange(range);

	const startIso = start.toISOString();
	const endIso = end.toISOString();

	const period = range === '7d' ? 'daily' : range === '90d' ? 'weekly' : range === 'year' ? 'monthly' : 'daily';

	try {
		const [revenueRes, ordersRes, sellersRes, retentionRes, funnelRes] = await Promise.all([
			apiFetch(`/api/v1/merchant/analytics/revenue?period=${period}&startDate=${encodeURIComponent(startIso)}&endDate=${encodeURIComponent(endIso)}`, { headers: { Cookie: cookie } }),
			apiFetch(`/api/v1/merchant/analytics/orders?period=${period}&startDate=${encodeURIComponent(startIso)}&endDate=${encodeURIComponent(endIso)}`, { headers: { Cookie: cookie } }),
			apiFetch(`/api/v1/merchant/analytics/best-sellers?limit=10&startDate=${encodeURIComponent(startIso)}&endDate=${encodeURIComponent(endIso)}`, { headers: { Cookie: cookie } }),
			apiFetch(`/api/v1/merchant/analytics/retention?period=monthly&startDate=${encodeURIComponent(startIso)}&endDate=${encodeURIComponent(endIso)}`, { headers: { Cookie: cookie } }),
			apiFetch(`/api/v1/merchant/analytics/funnel?startDate=${encodeURIComponent(startIso)}&endDate=${encodeURIComponent(endIso)}`, { headers: { Cookie: cookie } }),
		]);

		const revenue = revenueRes.ok ? await revenueRes.json() : { data: [] };
		const orders = ordersRes.ok ? await ordersRes.json() : { data: [] };
		const sellers = sellersRes.ok ? await sellersRes.json() : { data: [] };
		const retention = retentionRes.ok ? await retentionRes.json() : { data: [] };
		const funnel = funnelRes.ok ? await funnelRes.json() : { data: [] };

		return {
			range,
			revenue: revenue.data || [],
			orders: orders.data || [],
			bestSellers: sellers.data || [],
			retention: retention.data || [],
			funnel: funnel.data || [],
		};
	} catch {
		return {
			range,
			revenue: [],
			orders: [],
			bestSellers: [],
			retention: [],
			funnel: [],
		};
	}
};
