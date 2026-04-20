const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

/**
 * Server-side fetch wrapper for backend API calls.
 * Uses 'manual' redirect so Set-Cookie headers are preserved
 * and can be forwarded to the browser via forwardCookies().
 */
export async function apiFetch(
	path: string,
	options: RequestInit = {},
): Promise<Response> {
	return fetch(`${API_BASE}${path}`, {
		...options,
		redirect: 'manual',
	});
}