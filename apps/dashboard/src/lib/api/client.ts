const API_BASE = '/api/v1';

interface ApiOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers as Record<string, string>);
  headers.set('Content-Type', 'application/json');

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: 'Unknown Error',
      message: 'An unexpected error occurred',
    }));
    throw error;
  }

  return res.json();
}

export async function serverApiFetch<T>(
  path: string,
  options: ApiOptions = {},
  cookie?: string,
): Promise<T> {
  const API_SERVER_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
  const headers = new Headers(options.headers as Record<string, string>);
  headers.set('Content-Type', 'application/json');
  if (cookie) headers.set('Cookie', cookie);

  const res = await fetch(`${API_SERVER_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: 'Unknown Error',
      message: 'An unexpected error occurred',
    }));
    throw error;
  }

  return res.json();
}