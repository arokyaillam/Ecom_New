const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

/**
 * Server-side fetch wrapper that proxies requests to the backend API.
 * Automatically injects the Host header for multi-tenant store resolution.
 * Uses `redirect: 'manual'` so Set-Cookie headers are preserved.
 * Forwards CSRF token on mutating requests.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  host?: string,
  csrfToken?: string,
): Promise<Response> {
  const headers = new Headers(options.headers as Record<string, string>);
  if (host) headers.set('Host', host);
  if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    redirect: 'manual',
  });
}