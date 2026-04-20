import { redirect } from '@sveltejs/kit';
import { safeDecodeJWT, isTokenExpired, getAuthScope, type SuperAdminJWTPayload } from '@repo/shared-utils/jwt';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const token = cookies.get('access_token');

	if (!token) {
		redirect(303, '/admin-login');
	}

	const payload = safeDecodeJWT(token);

	if (!payload || isTokenExpired(payload)) {
		redirect(303, '/admin-login');
	}

	const scope = getAuthScope(payload);
	if (scope !== 'superadmin') {
		redirect(303, '/admin-login');
	}

	// Ensure the token has the required superadmin claims
	if (!('superAdminId' in payload)) {
		redirect(303, '/admin-login');
	}

	const admin = payload as SuperAdminJWTPayload;

	return {
		user: {
			superAdminId: admin.superAdminId,
			role: admin.role,
		},
	};
};