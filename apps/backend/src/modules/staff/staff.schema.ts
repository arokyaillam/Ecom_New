// Staff Zod schemas
import { z } from 'zod';

export const inviteSchema = z.strictObject({
  email: z.email(),
  role: z.enum(['MANAGER', 'CASHIER']),
});

export const updateRoleSchema = z.strictObject({
  role: z.enum(['MANAGER', 'CASHIER']),
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