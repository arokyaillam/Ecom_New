// Auth Reset Service - Email verification and password reset
import { db } from '../db/index.js';
import { verificationTokens, customers, users } from '../db/schema.js';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { ErrorCodes } from '../errors/codes.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const VERIFY_EXPIRY_HOURS = 24;
const RESET_EXPIRY_HOURS = 1;

export const authResetService = {
  // Generate a verification/reset token
  async generateToken(email: string, type: 'email_verification' | 'password_reset', userType: 'customer' | 'merchant', storeId?: string) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + (type === 'email_verification' ? VERIFY_EXPIRY_HOURS : RESET_EXPIRY_HOURS) * 60 * 60 * 1000
    );

    // Invalidate any existing tokens of the same type for this email
    await db.delete(verificationTokens).where(
      and(
        eq(verificationTokens.email, email),
        eq(verificationTokens.type, type),
        eq(verificationTokens.userType, userType),
      )
    );

    const [record] = await db.insert(verificationTokens).values({
      email,
      token,
      type,
      userType,
      storeId: storeId || null,
      expiresAt,
    }).returning();

    return record;
  },

  // Verify email with token
  async verifyEmail(token: string) {
    const record = await db.query.verificationTokens.findFirst({
      where: and(
        eq(verificationTokens.token, token),
        eq(verificationTokens.type, 'email_verification'),
        gt(verificationTokens.expiresAt, new Date()),
        isNull(verificationTokens.usedAt),
      ),
    });

    if (!record) {
      throw Object.assign(new Error('Invalid or expired verification token'), { code: ErrorCodes.VERIFICATION_TOKEN_EXPIRED });
    }

    // Mark token as used
    await db.update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(verificationTokens.id, record.id));

    // Mark email as verified
    if (record.userType === 'customer' && record.storeId) {
      const result = await db.update(customers)
        .set({ isVerified: true })
        .where(and(eq(customers.email, record.email), eq(customers.storeId, record.storeId)))
        .returning();

      if (result.length === 0) {
        throw Object.assign(new Error('Customer not found'), { code: ErrorCodes.CUSTOMER_NOT_FOUND });
      }

      return { verified: true, userType: 'customer', email: record.email };
    }

    if (record.userType === 'merchant') {
      // Merchant users table doesn't have isVerified - just confirm token was valid
      return { verified: true, userType: 'merchant', email: record.email };
    }

    throw Object.assign(new Error('Invalid token'), { code: ErrorCodes.TOKEN_INVALID });
  },

  // Request password reset - generates token (email sending is done by caller)
  async requestPasswordReset(email: string, storeId: string | undefined, userType: 'customer' | 'merchant') {
    // Check user exists
    if (userType === 'customer' && storeId) {
      const customer = await db.query.customers.findFirst({
        where: and(eq(customers.email, email), eq(customers.storeId, storeId)),
      });
      if (!customer) {
        // Don't reveal if email exists - return success anyway
        return { token: null, emailNotFound: true };
      }

      if (customer.isVerified === false) {
        throw Object.assign(new Error('Email not verified'), { code: ErrorCodes.EMAIL_NOT_VERIFIED });
      }
    } else if (userType === 'merchant') {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (!user) {
        return { token: null, emailNotFound: true };
      }
    }

    const record = await authResetService.generateToken(email, 'password_reset', userType, storeId);
    return { token: record.token, emailNotFound: false };
  },

  // Reset password with token
  async resetPassword(token: string, newPassword: string) {
    const record = await db.query.verificationTokens.findFirst({
      where: and(
        eq(verificationTokens.token, token),
        eq(verificationTokens.type, 'password_reset'),
        gt(verificationTokens.expiresAt, new Date()),
        isNull(verificationTokens.usedAt),
      ),
    });

    if (!record) {
      throw Object.assign(new Error('Invalid or expired reset token'), { code: ErrorCodes.PASSWORD_RESET_EXPIRED });
    }

    // Mark token as used
    await db.update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(verificationTokens.id, record.id));

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password based on user type
    if (record.userType === 'customer' && record.storeId) {
      await db.update(customers)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(and(eq(customers.email, record.email), eq(customers.storeId, record.storeId)));
    } else if (record.userType === 'merchant') {
      await db.update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.email, record.email));
    }

    return { reset: true, email: record.email };
  },

  // Resend verification email
  async resendVerification(email: string, storeId: string | undefined, userType: 'customer' | 'merchant') {
    // Check if already verified (customer only)
    if (userType === 'customer' && storeId) {
      const customer = await db.query.customers.findFirst({
        where: and(eq(customers.email, email), eq(customers.storeId, storeId)),
        columns: { isVerified: true },
      });
      if (customer?.isVerified) {
        throw Object.assign(new Error('Email already verified'), { code: ErrorCodes.EMAIL_ALREADY_VERIFIED });
      }
    }

    const record = await authResetService.generateToken(email, 'email_verification', userType, storeId);
    return { token: record.token };
  },
};