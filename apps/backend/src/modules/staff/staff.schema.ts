// Staff Zod schemas
import { z } from 'zod';

export const VALID_PERMISSIONS = [
  'products:read', 'products:write',
  'orders:read', 'orders:write', 'orders:refund',
  'customers:read', 'customers:write',
  'coupons:read', 'coupons:write',
  'analytics:read',
  'reviews:read', 'reviews:write',
  'categories:read', 'categories:write',
  'modifiers:read', 'modifiers:write',
  'store:read', 'store:write',
  'payments:config', 'payments:refund', 'payments:manage',
  'shipping:write',
  'tax:write',
  'upload:write',
  'staff:write',
  'inventory:write',
] as const;

export const inviteSchema = z.strictObject({
  email: z.email(),
  role: z.enum(['MANAGER', 'CASHIER']),
  permissions: z.array(z.string()).optional(),
});

export const updateRoleSchema = z.strictObject({
  role: z.enum(['MANAGER', 'CASHIER']),
});

export const updatePermissionsSchema = z.strictObject({
  permissions: z.array(z.string()),
});

export const tokenParamSchema = z.strictObject({
  token: z.string().min(1),
});

export const acceptInviteSchema = z.strictObject({
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and number',
  ),
  name: z.string().max(255).optional(),
});