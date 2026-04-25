// Audit log service — business logic, calls repo
import { auditRepo } from './audit.repo.js';

export const auditService = {
  async log(data: {
    storeId: string;
    userId?: string;
    userEmail?: string;
    action: string;
    entityType: string;
    entityId?: string;
    description: string;
    previousValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) {
    const [record] = await auditRepo.insert({
      storeId: data.storeId,
      userId: data.userId ?? null,
      userEmail: data.userEmail ?? null,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId ?? null,
      description: data.description,
      previousValues: data.previousValues ?? null,
      newValues: data.newValues ?? null,
      metadata: data.metadata ?? null,
    });
    return record;
  },

  async findByStoreId(
    storeId: string,
    opts: {
      page: number;
      limit: number;
      action?: string;
      entityType?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const [items, countResult] = await Promise.all([
      auditRepo.findByStoreId(storeId, opts),
      auditRepo.countByStoreId(storeId, opts),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      items,
      total,
      page: opts.page,
      limit: opts.limit,
      totalPages: Math.ceil(total / opts.limit),
    };
  },
};
