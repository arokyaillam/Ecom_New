// Customer service — business logic, calls customerRepo, never imports db directly
import { customerRepo } from './customer.repo.js';
import { ErrorCodes } from '../../errors/codes.js';
import { auditService } from '../audit/audit.service.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const customerService = {
  async findByStoreId(storeId: string, opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const { rows, total } = await customerRepo.findByStoreId(storeId, { limit, offset });

    // Enrich with LTV and orderCount
    const customerIds = rows.map((r) => r.id);
    const aggregates = await customerRepo.getCustomerAggregates(customerIds, storeId);
    const aggMap = new Map(aggregates.map((a) => [a.customerId, a]));

    const data = rows.map((customer) => {
      const agg = aggMap.get(customer.id);
      return {
        ...customer,
        ltv: agg?.ltv ?? '0',
        orderCount: agg?.orderCount ?? 0,
      };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(customerId: string, storeId: string) {
    const customer = await customerRepo.findById(customerId, storeId);

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), {
        code: ErrorCodes.CUSTOMER_NOT_FOUND,
      });
    }

    return customer;
  },

  async getCustomerDetail(customerId: string, storeId: string) {
    const customer = await customerRepo.findById(customerId, storeId);

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), {
        code: ErrorCodes.CUSTOMER_NOT_FOUND,
      });
    }

    const [ltv, orderCount, ordersResult] = await Promise.all([
      customerRepo.getCustomerLTV(customerId, storeId),
      customerRepo.getCustomerOrderCount(customerId, storeId),
      customerRepo.getCustomerOrders(customerId, storeId, { page: 1, limit: 5 }),
    ]);

    // Strip password from response
    const { password: _, ...customerWithoutPassword } = customer as Record<string, unknown>;

    return {
      customer: customerWithoutPassword,
      ltv,
      orderCount,
      orders: ordersResult.data,
    };
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
    const existing = await customerRepo.findByEmail(data.email, data.storeId);

    if (existing) {
      throw Object.assign(new Error('Customer already exists'), {
        code: ErrorCodes.CUSTOMER_ALREADY_EXISTS,
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const result = await customerRepo.withTransaction(async (tx) => {
      const customer = await customerRepo.insertCustomer({
        storeId: data.storeId,
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      }, tx);

      // Insert addresses if provided
      if (data.addresses && data.addresses.length > 0) {
        await customerRepo.insertAddresses(
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
          tx,
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
    const customer = await customerRepo.findById(customerId, storeId);

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), {
        code: ErrorCodes.CUSTOMER_NOT_FOUND,
      });
    }

    const updated = await customerRepo.updateCustomer(customerId, storeId, data);

    // Strip password from response
    if (updated) {
      const { password: _, ...result } = updated;
      return result;
    }
    return updated;
  },

  async blockCustomer(customerId: string, storeId: string, userId?: string, reason?: string) {
    const customer = await customerRepo.findById(customerId, storeId);

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), {
        code: ErrorCodes.CUSTOMER_NOT_FOUND,
      });
    }

    const updated = await customerRepo.updateBlockedStatus(customerId, storeId, true, reason);

    // Audit log
    try {
      await auditService.log({
        storeId,
        userId,
        action: 'block',
        entityType: 'customer',
        entityId: customerId,
        description: `Customer blocked`,
        previousValues: { isBlocked: false },
        newValues: { isBlocked: true, reason },
      });
    } catch {
      // Non-blocking
    }

    // Strip password from response
    if (updated) {
      const { password: _, ...result } = updated;
      return result;
    }
    return updated;
  },

  async unblockCustomer(customerId: string, storeId: string, userId?: string) {
    const customer = await customerRepo.findById(customerId, storeId);

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), {
        code: ErrorCodes.CUSTOMER_NOT_FOUND,
      });
    }

    const updated = await customerRepo.updateBlockedStatus(customerId, storeId, false);

    // Audit log
    try {
      await auditService.log({
        storeId,
        userId,
        action: 'block',
        entityType: 'customer',
        entityId: customerId,
        description: `Customer unblocked`,
        previousValues: { isBlocked: true },
        newValues: { isBlocked: false },
      });
    } catch {
      // Non-blocking
    }

    // Strip password from response
    if (updated) {
      const { password: _, ...result } = updated;
      return result;
    }
    return updated;
  },

  async findByEmail(email: string, storeId: string) {
    // Return the full customer including password for auth verification
    return customerRepo.findByEmail(email, storeId);
  },

  async gdprExport(customerId: string, storeId: string) {
    const customer = await customerRepo.findFullProfileForExport(customerId, storeId);

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), {
        code: ErrorCodes.CUSTOMER_NOT_FOUND,
      });
    }

    return customer;
  },

  async deleteProfile(customerId: string, storeId: string) {
    const customer = await customerRepo.findById(customerId, storeId);

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), {
        code: ErrorCodes.CUSTOMER_NOT_FOUND,
      });
    }

    const anonymized = await customerRepo.anonymizeCustomer(customerId, storeId);

    // Strip password from response
    if (anonymized) {
      const { password: _, ...result } = anonymized;
      return result;
    }

    return anonymized;
  },
};
