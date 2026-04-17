// Address Zod schemas — Phase 1
import { z } from 'zod';
import { idParamSchema } from '../_shared/schema.js';

export { idParamSchema };

export const createAddressSchema = z.strictObject({
  name: z.string().min(1).max(255),
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  addressLine1: z.string().min(1).max(500),
  addressLine2: z.string().max(500).optional(),
  city: z.string().min(1).max(255),
  state: z.string().max(255).optional(),
  country: z.string().min(1).max(2),
  postalCode: z.string().min(1).max(20),
  phone: z.string().max(50).optional(),
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  addressLine1: z.string().min(1).max(500).optional(),
  addressLine2: z.string().max(500).optional(),
  city: z.string().min(1).max(255).optional(),
  state: z.string().max(255).optional(),
  country: z.string().min(1).max(2).optional(),
  postalCode: z.string().min(1).max(20).optional(),
  phone: z.string().max(50).optional(),
  isDefault: z.boolean().optional(),
});