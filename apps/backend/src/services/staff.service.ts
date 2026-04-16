// Staff Service - Staff management, invitations, and permissions
import { db } from '../db/index.js';
import { users, staffInvitations, rolePermissions } from '../db/schema.js';
import { eq, and, gt, ne } from 'drizzle-orm';
import { ErrorCodes } from '../errors/codes.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const INVITE_EXPIRY_DAYS = 7;

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  OWNER: ['*'],
  MANAGER: [
    'products:read', 'products:write',
    'orders:read', 'orders:write',
    'customers:read',
    'coupons:read', 'coupons:write',
    'analytics:read',
    'reviews:read', 'reviews:write',
    'categories:read', 'categories:write',
    'modifiers:read', 'modifiers:write',
    'store:read',
  ],
  CASHIER: [
    'orders:read', 'orders:write',
    'customers:read',
    'products:read',
  ],
};

export const staffService = {
  // Invite a staff member
  async inviteStaff(storeId: string, email: string, role: string, invitedBy: string) {
    if (!['MANAGER', 'CASHIER'].includes(role)) {
      throw Object.assign(new Error('Invalid staff role'), { code: ErrorCodes.VALIDATION_ERROR });
    }

    // Check if user already exists in this store
    const existing = await db.query.users.findFirst({
      where: and(eq(users.email, email), eq(users.storeId, storeId)),
    });
    if (existing) {
      throw Object.assign(new Error('User already exists in this store'), { code: ErrorCodes.USER_ALREADY_EXISTS });
    }

    // Check for pending invitation
    const pendingInvite = await db.query.staffInvitations.findFirst({
      where: and(
        eq(staffInvitations.email, email),
        eq(staffInvitations.storeId, storeId),
        eq(staffInvitations.status, 'pending'),
        gt(staffInvitations.expiresAt, new Date()),
      ),
    });
    if (pendingInvite) {
      throw Object.assign(new Error('Pending invitation already exists'), { code: ErrorCodes.VALIDATION_ERROR });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const [invitation] = await db.insert(staffInvitations).values({
      storeId,
      email,
      role,
      invitedBy,
      token,
      expiresAt,
    }).returning();

    return invitation;
  },

  // Accept staff invitation (no auth - new user)
  async acceptInvitation(token: string, password: string, _name?: string) {
    const invitation = await db.query.staffInvitations.findFirst({
      where: and(
        eq(staffInvitations.token, token),
        eq(staffInvitations.status, 'pending'),
        gt(staffInvitations.expiresAt, new Date()),
      ),
    });

    if (!invitation) {
      throw Object.assign(new Error('Invitation not found or expired'), { code: ErrorCodes.STAFF_INVITE_NOT_FOUND });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const [user] = await db.insert(users).values({
      email: invitation.email,
      password: hashedPassword,
      role: invitation.role,
      storeId: invitation.storeId,
    }).returning();

    // Mark invitation as accepted
    await db.update(staffInvitations)
      .set({ status: 'accepted', acceptedAt: new Date(), userId: user.id })
      .where(eq(staffInvitations.id, invitation.id));

    return { user: { id: user.id, email: user.email, role: user.role, storeId: user.storeId }, invitation };
  },

  // Reject staff invitation
  async rejectInvitation(token: string) {
    const invitation = await db.query.staffInvitations.findFirst({
      where: and(
        eq(staffInvitations.token, token),
        eq(staffInvitations.status, 'pending'),
      ),
    });

    if (!invitation) {
      throw Object.assign(new Error('Invitation not found'), { code: ErrorCodes.STAFF_INVITE_NOT_FOUND });
    }

    await db.update(staffInvitations)
      .set({ status: 'rejected' })
      .where(eq(staffInvitations.id, invitation.id));

    return { rejected: true };
  },

  // List staff members (non-OWNER users)
  async listStaff(storeId: string) {
    return db.query.users.findMany({
      where: and(eq(users.storeId, storeId), ne(users.role, 'OWNER')),
      columns: { id: true, email: true, role: true, storeId: true, createdAt: true },
    });
  },

  // List pending invitations
  async listInvitations(storeId: string) {
    return db.query.staffInvitations.findMany({
      where: and(
        eq(staffInvitations.storeId, storeId),
        eq(staffInvitations.status, 'pending'),
        gt(staffInvitations.expiresAt, new Date()),
      ),
    });
  },

  // Update staff role
  async updateStaffRole(userId: string, storeId: string, role: string) {
    if (!['MANAGER', 'CASHIER'].includes(role)) {
      throw Object.assign(new Error('Invalid staff role'), { code: ErrorCodes.VALIDATION_ERROR });
    }

    const user = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.storeId, storeId)),
    });

    if (!user) {
      throw Object.assign(new Error('Staff member not found'), { code: ErrorCodes.STAFF_NOT_FOUND });
    }

    if (user.role === 'OWNER') {
      throw Object.assign(new Error('Cannot change owner role'), { code: ErrorCodes.CANNOT_REMOVE_OWNER });
    }

    const [updated] = await db.update(users)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.storeId, storeId)))
      .returning();

    return { id: updated.id, email: updated.email, role: updated.role };
  },

  // Remove staff member
  async removeStaff(userId: string, storeId: string) {
    const user = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.storeId, storeId)),
    });

    if (!user) {
      throw Object.assign(new Error('Staff member not found'), { code: ErrorCodes.STAFF_NOT_FOUND });
    }

    if (user.role === 'OWNER') {
      throw Object.assign(new Error('Cannot remove store owner'), { code: ErrorCodes.CANNOT_REMOVE_OWNER });
    }

    await db.delete(users).where(and(eq(users.id, userId), eq(users.storeId, storeId)));
    return { removed: true };
  },

  // Check if user has a specific permission
  async hasPermission(userRole: string, permission: string, storeId?: string): Promise<boolean> {
    // OWNER has all permissions
    if (DEFAULT_PERMISSIONS.OWNER.includes('*') && userRole === 'OWNER') return true;

    // Check DB overrides first
    if (storeId) {
      const override = await db.query.rolePermissions.findFirst({
        where: and(eq(rolePermissions.storeId, storeId), eq(rolePermissions.role, userRole)),
      });
      if (override) {
        return override.permissions.includes('*') || override.permissions.includes(permission);
      }
    }

    // Fall back to defaults
    const perms = DEFAULT_PERMISSIONS[userRole];
    if (!perms) return false;
    return perms.includes('*') || perms.includes(permission);
  },
};