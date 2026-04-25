import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	try {
		const res = await apiFetch('/api/v1/merchant/store/integrations', { headers: { Cookie: cookie } });
		const data = res.ok ? await res.json() : { integrations: {} };
		return { integrations: data.integrations ?? {} };
	} catch {
		return { integrations: {} };
	}
};
