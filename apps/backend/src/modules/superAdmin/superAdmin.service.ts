// SuperAdmin service — business logic and domain errors.
// Calls superAdminRepo for all DB operations.
import { ErrorCodes } from '../../errors/codes.js';
import { superAdminRepo } from './superAdmin.repo.js';

export const superAdminService = {
  // ─── Store management ───

  async listStores(opts?: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const { data, total } = await superAdminRepo.findStores({ page, limit, status: opts?.status });

    // Strip sensitive fields
    const sanitized = data.map(({ ownerEmail, ownerName, ownerPhone, ...rest }) => rest);

    return {
      data: sanitized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getStore(storeId: string) {
    const store = await superAdminRepo.findStoreById(storeId);

    if (!store) {
      throw Object.assign(new Error('Store not found'), {
        code: ErrorCodes.STORE_NOT_FOUND,
      });
    }

    return store;
  },

  async approveStore(storeId: string, adminId: string) {
    const store = await superAdminRepo.findStoreById(storeId);

    if (!store) {
      throw Object.assign(new Error('Store not found'), {
        code: ErrorCodes.STORE_NOT_FOUND,
      });
    }

    if (store.status === 'active') {
      throw Object.assign(new Error('Store is already active'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return superAdminRepo.updateStore(storeId, {
      status: 'active',
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: adminId,
    });
  },

  async suspendStore(storeId: string) {
    const store = await superAdminRepo.findStoreById(storeId);

    if (!store) {
      throw Object.assign(new Error('Store not found'), {
        code: ErrorCodes.STORE_NOT_FOUND,
      });
    }

    return superAdminRepo.updateStore(storeId, {
      status: 'suspended',
    });
  },

  async reactivateStore(storeId: string) {
    const store = await superAdminRepo.findStoreById(storeId);

    if (!store) {
      throw Object.assign(new Error('Store not found'), {
        code: ErrorCodes.STORE_NOT_FOUND,
      });
    }

    return superAdminRepo.updateStore(storeId, {
      status: 'active',
    });
  },

  // ─── Plan management ───

  async listPlans() {
    return superAdminRepo.findPlans();
  },

  async getPlan(planId: string) {
    const plan = await superAdminRepo.findPlanById(planId);

    if (!plan) {
      throw Object.assign(new Error('Plan not found'), {
        code: ErrorCodes.PLAN_NOT_FOUND,
      });
    }

    return plan;
  },

  async createPlan(data: typeof import('../../db/schema.js').merchantPlans.$inferInsert) {
    return superAdminRepo.insertPlan(data);
  },

  async updatePlan(planId: string, data: Partial<typeof import('../../db/schema.js').merchantPlans.$inferInsert>) {
    const plan = await superAdminRepo.findPlanById(planId);

    if (!plan) {
      throw Object.assign(new Error('Plan not found'), {
        code: ErrorCodes.PLAN_NOT_FOUND,
      });
    }

    return superAdminRepo.updatePlan(planId, data);
  },

  async deletePlan(planId: string) {
    const plan = await superAdminRepo.findPlanById(planId);

    if (!plan) {
      throw Object.assign(new Error('Plan not found'), {
        code: ErrorCodes.PLAN_NOT_FOUND,
      });
    }

    await superAdminRepo.deletePlan(planId);
    return { id: planId, deleted: true };
  },

  // ─── Dashboard stats ───

  async getPlatformStats() {
    const [totalStores, activeStores, totalPlans] = await Promise.all([
      superAdminRepo.countStores(),
      superAdminRepo.countActiveStores(),
      superAdminRepo.countPlans(),
    ]);

    return {
      totalStores,
      activeStores,
      totalPlans,
    };
  },
};