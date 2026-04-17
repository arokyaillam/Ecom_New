// Shared Zod schemas (idParam, paginationQuery, etc.) — Phase 1
import { z } from 'zod';

/** UUID path parameter: { id: uuid } */
export const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});

/** Pagination query: page & limit */
export const paginationQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Login credentials (email + password) */
export const loginSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(1),
});

/** Email-only body */
export const emailSchema = z.strictObject({ email: z.email() });

/** Verify-email token body */
export const verifyEmailSchema = z.strictObject({ token: z.string().min(1) });

/** Reset-password body (token + new password) */
export const resetPasswordSchema = z.strictObject({
  token: z.string().min(1),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and number',
  ),
});