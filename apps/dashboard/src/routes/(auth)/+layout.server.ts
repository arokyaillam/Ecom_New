import type { LayoutServerLoad } from './$types';

// Auth pages are public — no guard needed.
// If a user is already authenticated, redirect them away from auth pages.
export const load: LayoutServerLoad = async ({ cookies }) => {
	const token = cookies.get('access_token');

	if (token) {
		// Let the page decide if it wants to redirect.
		// We just pass the info that a user might already be logged in.
		return { authenticated: true };
	}

	return { authenticated: false };
};