// Customer Service - Customer CRUD with addresses
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { customers, customerAddresses } from '../db/schema.js';
import { eq, and, desc, count } from 'drizzle-orm';
import { ErrorCodes } from '../errors/codes.js';

const SALT_ROUNDS = 12;

export const customerService = {
  async findByStoreId(storeId: string, opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const where = eq(customers.storeId, storeId);

    const [rows, totalResult] = await Promise.all([
      db.query.customers.findMany({
        where,
        columns: {
          id: true,
          storeId: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          isVerified: true,
          marketingEmails: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: desc(customers.createdAt),
        limit,
        offset,
        with: {
          addresses: true,
        },
      }),
      db.select({ count: count() })
        .from(customers)
        .where(where),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(customerId: string, storeId: string) {
    const customer = await db.query.customers.findFirst({
      where: and(eq(customers.id, customerId), eq(customers.storeId, storeId)),
      columns: {
        id: true,
        storeId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        isVerified: true,
        marketingEmails: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        addresses: true,
        orders: {
          orderBy: desc(customers.createdAt),
          limit: 10,
        },
      },
    });

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), {
        code: ErrorCodes.CUSTOMER_NOT_FOUND,
      });
    }

    return customer;
  },

  async create(data: {
    storeId: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    addresses?: Array<{
      name: string;
      firstName: string;
      lastName: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state?: string;
      country: string;
      postalCode: string;
      phone?: string;
      isDefault?: boolean;
    }>;
  }) {
    // Check if customer already exists in this store
    const existing = await db.query.customers.findFirst({
      where: and(
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

    const result = await db.transaction(async (tx) => {
      const [customer] = await tx.insert(customers).values({
        storeId: data.storeId,
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      }).returning();

      // Insert addresses if provided
      if (data.addresses && data.addresses.length > 0) {
        await tx.insert(customerAddresses).values(
          data.addresses.map((addr) => ({
            customerId: customer.id,
            storeId: data.storeId,
            name: addr.name,
            firstName: addr.firstName,
            lastName: addr.lastName,
            addressLine1: addr.addressLine1,
            addressLine2: addr.addressLine2,
            city: addr.city,
            state: addr.state,
            country: addr.country,
            postalCode: addr.postalCode,
            phone: addr.phone,
            isDefault: addr.isDefault ?? false,
          })),
        );
      }

      return customer;
    });

    // Strip password from response
    const { password: _, ...created } = result;
    return created;
  },

  async update(customerId: string, storeId: string, data: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    avatarUrl: string;
    marketingEmails: boolean;
  }>) {
    const customer = await db.query.customers.findFirst({
      where: and(eq(customers.id, customerId), eq(customers.storeId, storeId)),
    });

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), {
        code: ErrorCodes.CUSTOMER_NOT_FOUND,
      });
    }

    const [updated] = await db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(customers.id, customerId), eq(customers.storeId, storeId)))
      .returning();

    // Strip password from response
    const { password: _, ...result } = updated;
    return result;
  },

  async findByEmail(email: string, storeId: string) {
    const customer = await db.query.customers.findFirst({
      where: and(
        eq(customers.email, email),
        eq(customers.storeId, storeId),
      ),
    });

    // Return the full customer including password for auth verification
    return customer;
  },
};