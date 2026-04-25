import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;

	try {
		const res = await apiFetch(`/api/v1/merchant/payments/${params.id}`, {
			headers: { Cookie: cookie },
		});

		if (!res.ok) error(404, 'Payment not found');

		const data = await res.json();
		return { payment: data.payment, refunds: data.refunds || [] };
	} catch (err: any) {
		if (err?.status) throw err;
		error(500, 'Failed to load payment');
	}
};
