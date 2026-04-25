import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	try {
		const res = await apiFetch(`/api/v1/merchant/store/domain`, { headers: { Cookie: cookie } });
		const domain = res.ok ? await res.json() : {};
		return { domain };
	} catch {
		return { domain: {} };
	}
};
