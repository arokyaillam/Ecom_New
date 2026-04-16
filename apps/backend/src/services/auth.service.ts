// Auth Service - Password hashing and JWT generation
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { customers } from '../db/schema.js';
import { superAdmins } from '../db/schema.js';
import { stores } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { ErrorCodes } from '../errors/codes.js';

const SALT_ROUNDS = 12;

export const authService = {
  // Password hashing
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  // Password verification - never pre-sanitize the password
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  // Merchant auth - find user by email and verify
  async verifyMerchantCredentials(email: string, password: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      throw Object.assign(new Error('Invalid credentials'), {
        code: ErrorCodes.INVALID_CREDENTIALS,
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw Object.assign(new Error('Invalid credentials'), {
        code: ErrorCodes.INVALID_CREDENTIALS,
      });
    }

    return user;
  },

  // Merchant registration - create store and user
  async registerMerchant(data: {
    storeName: string;
    domain: string;
    ownerEmail: string;
    ownerName?: string;
    ownerPhone?: string;
    password: string;
  }) {
    // Check if store with this email already exists
    const existingStore = await db.query.stores.findFirst({
      where: eq(stores.ownerEmail, data.ownerEmail),
    });

    if (existingStore) {
      throw Object.assign(new Error('Store with this email already exists'), {
        code: ErrorCodes.USER_ALREADY_EXISTS,
      });
    }

    // Check if domain already exists
    const existingDomain = await db.query.stores.findFirst({
      where: eq(stores.domain, data.domain),
    });

    if (existingDomain) {
      throw Object.assign(new Error('Domain already taken'), {
        code: ErrorCodes.USER_ALREADY_EXISTS,
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create store
    const [store] = await db.insert(stores).values({
      name: data.storeName,
      domain: data.domain,
      ownerEmail: data.ownerEmail,
      ownerName: data.ownerName,
      ownerPhone: data.ownerPhone,
      status: 'pending',
      isApproved: false,
    }).returning();

    // Create user
    const [user] = await db.insert(users).values({
      email: data.ownerEmail,
      password: hashedPassword,
      role: 'OWNER',
      storeId: store.id,
    }).returning();

    return { store, user };
  },

  // Customer auth - find customer by email+storeId and verify
  async verifyCustomerCredentials(email: string, password: string, storeId: string) {
    const customer = await db.query.customers.findFirst({
      where: (customers, { eq, and }) => and(
        eq(customers.email, email),
        eq(customers.storeId, storeId),
      ),
    });

    if (!customer) {
      throw Object.assign(new Error('Invalid credentials'), {
        code: ErrorCodes.INVALID_CREDENTIALS,
      });
    }

    const isValid = await bcrypt.compare(password, customer.password);
    if (!isValid) {
      throw Object.assign(new Error('Invalid credentials'), {
        code: ErrorCodes.INVALID_CREDENTIALS,
      });
    }

    return customer;
  },

  // Customer registration
  async registerCustomer(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    storeId: string;
  }) {
    // Check if customer already exists in this store
    const existing = await db.query.customers.findFirst({
      where: (customers, { eq, and }) => and(
        eq(customers.email, data.email),
        eq(customers.storeId, data.storeId),
      ),
    });

    if (existing) {
      throw Object.assign(new Error('Customer already exists'), {
        code: ErrorCodes.CUSTOMER_ALREADY_EXISTS,
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const [customer] = await db.insert(customers).values({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      storeId: data.storeId,
    }).returning();

    return customer;
  },

  // SuperAdmin auth
  async verifySuperAdminCredentials(email: string, password: string) {
    const admin = await db.query.superAdmins.findFirst({
      where: eq(superAdmins.email, email),
    });

    if (!admin || !admin.isActive) {
      throw Object.assign(new Error('Invalid credentials'), {
        code: ErrorCodes.INVALID_CREDENTIALS,
      });
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      throw Object.assign(new Error('Invalid credentials'), {
        code: ErrorCodes.INVALID_CREDENTIALS,
      });
    }

    return admin;
  },
};