import type { PageServerLoad, Actions } from './$types';
import { apiFetch } from '$lib/server/api';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	const page = url.searchParams.get('page') || '1';
	const status = url.searchParams.get('status') || '';

	const params = new URLSearchParams({ page, limit: '20' });
	if (status) params.set('status', status);

	try {
		const res = await apiFetch(`/api/v1/merchant/support?${params}`, {
			headers: { Cookie: cookie },
		});
		const data = res.ok ? await res.json() : { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
		return { tickets: data, status };
	} catch {
		return { tickets: { items: [], total: 0, page: 1, limit: 20, totalPages: 0 }, status };
	}
};

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		const cookie = `access_token=${cookies.get('access_token')}`;
		const formData = await request.formData();

		const subject = String(formData.get('subject') || '');
		const description = String(formData.get('description') || '');
		const category = String(formData.get('category') || '');
		const priority = String(formData.get('priority') || 'medium');

		if (!subject || !description || !category) {
			return fail(400, { error: 'Subject, description, and category are required' });
		}

		try {
			const res = await apiFetch('/api/v1/merchant/support', {
				method: 'POST',
				headers: { Cookie: cookie },
				body: JSON.stringify({ subject, description, category, priority }),
			});

			if (!res.ok) {
				const error = await res.json().catch(() => ({ message: 'Failed to create ticket' }));
				return fail(res.status, { error: error.message || 'Failed to create ticket' });
			}

			const ticket = await res.json();
			return { success: true, ticket };
		} catch (e) {
			return fail(500, { error: e instanceof Error ? e.message : 'Failed to create ticket' });
		}
	},

	close: async ({ request, cookies }) => {
		const cookie = `access_token=${cookies.get('access_token')}`;
		const formData = await request.formData();
		const ticketId = String(formData.get('ticketId') || '');

		if (!ticketId) {
			return fail(400, { error: 'Ticket ID is required' });
		}

		try {
			const res = await apiFetch(`/api/v1/merchant/support/${ticketId}/status`, {
				method: 'PATCH',
				headers: { Cookie: cookie },
				body: JSON.stringify({ status: 'closed' }),
			});

			if (!res.ok) {
				const error = await res.json().catch(() => ({ message: 'Failed to close ticket' }));
				return fail(res.status, { error: error.message || 'Failed to close ticket' });
			}

			return { success: true };
		} catch (e) {
			return fail(500, { error: e instanceof Error ? e.message : 'Failed to close ticket' });
		}
	},
};
