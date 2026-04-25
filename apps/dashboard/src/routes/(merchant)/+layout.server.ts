import { redirect } from '@sveltejs/kit';
import { safeDecodeJWT, isTokenExpired, getAuthScope, type MerchantJWTPayload } from '@repo/shared-utils/jwt';
import { apiFetch } from '$lib/server/api';
import type { LayoutServerLoad } from './$types';

/** Default permissions per role when API is unreachable */
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
	OWNER: ['*'],
	MANAGER: [
		'products:read', 'products:write',
		'orders:read', 'orders:write', 'orders:refund',
		'customers:read',
		'coupons:read', 'coupons:write',
		'analytics:read',
		'reviews:read', 'reviews:write',
		'categories:read', 'categories:write',
		'modifiers:read', 'modifiers:write',
		'store:read', 'store:write',
		'payments:config', 'payments:manage', 'payments:refund',
		'shipping:write',
		'tax:write',
		'upload:write',
		'staff:write',
		'inventory:write',
	],
	CASHIER: [
		'orders:read', 'orders:write', 'orders:refund',
		'customers:read',
		'products:read',
	],
};

export const load: LayoutServerLoad = async ({ cookies, fetch }) => {
	const token = cookies.get('access_token');

	if (!token) {
		redirect(303, '/login');
	}

	const payload = safeDecodeJWT(token);

	if (!payload || isTokenExpired(payload)) {
		redirect(303, '/login');
	}

	const scope = getAuthScope(payload);
	if (scope !== 'merchant') {
		redirect(303, '/login');
	}

	// Ensure the token has the required merchant claims
	if (!('userId' in payload) || !('storeId' in payload)) {
		redirect(303, '/login');
	}

	const merchant = payload as MerchantJWTPayload;

	// Fetch current user profile with permissions from backend
	let userPermissions: string[] = [];
	try {
		const cookie = `access_token=${token}`;
		const res = await apiFetch('/api/v1/merchant/auth/me', { headers: { Cookie: cookie } });
		if (res.ok) {
			const data = await res.json();
			userPermissions = data.user?.permissions || [];
		}
	} catch {
		// Fallback to role-based defaults if API is unreachable
		userPermissions = DEFAULT_ROLE_PERMISSIONS[merchant.role] || [];
	}

	return {
		user: {
			userId: merchant.userId,
			storeId: merchant.storeId,
			role: merchant.role,
		},
		userPermissions,
	};
};