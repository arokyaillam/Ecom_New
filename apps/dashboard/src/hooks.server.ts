import type { Handle } from '@sveltejs/kit';
import { safeDecodeJWT, isTokenExpired, getAuthScope } from '@repo/shared-utils/jwt';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

function getRefreshUrl(scope: 'merchant' | 'admin'): string {
  return scope === 'admin'
    ? `${API_BASE}/api/v1/admin/auth/refresh`
    : `${API_BASE}/api/v1/merchant/auth/refresh`;
}

export const handle: Handle = async ({ event, resolve }) => {
  const accessToken = event.cookies.get('access_token');

  if (accessToken) {
    const payload = safeDecodeJWT(accessToken);

    if (payload && isTokenExpired(payload)) {
      const scope = getAuthScope(payload);
      if (scope === 'merchant' || scope === 'superadmin') {
        try {
          const refreshUrl = getRefreshUrl(scope === 'superadmin' ? 'admin' : 'merchant');
          const refreshResponse = await fetch(refreshUrl, {
            method: 'POST',
            headers: {
              Cookie: `refresh_token=${event.cookies.get('refresh_token')}`,
            },
          });

          if (refreshResponse.ok) {
            const setCookies = refreshResponse.headers.getSetCookie();
            for (const cookie of setCookies) {
              const [nameValue] = cookie.split(';');
              const eqIdx = nameValue.indexOf('=');
              const name = nameValue.substring(0, eqIdx).trim();
              const value = nameValue.substring(eqIdx + 1).trim();
              event.cookies.set(name, value, { path: '/' });
            }
          } else {
            event.cookies.delete('access_token', { path: '/' });
            event.cookies.delete('refresh_token', { path: '/' });
          }
        } catch {
          // Refresh failed — continue
        }
      }
    }

    if (payload) {
      const scope = getAuthScope(payload);
      if (scope === 'merchant' && 'userId' in payload) {
        event.locals.userId = payload.userId;
        event.locals.storeId = payload.storeId;
        event.locals.userRole = payload.role;
      } else if (scope === 'superadmin' && 'superAdminId' in payload) {
        event.locals.superAdminId = payload.superAdminId;
      }
    }
  }

  return resolve(event);
};