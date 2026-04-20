import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	try {
		const res = await apiFetch(`/api/v1/merchant/staff`, { headers: { Cookie: cookie } });
		const data = res.ok ? await res.json() : { staff: [], invitations: [] };
		return { staff: data.staff || [], invitations: data.invitations || [] };
	} catch {
		return { staff: [], invitations: [] };
	}
};
