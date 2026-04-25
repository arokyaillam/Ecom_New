// Marketing service — business logic, calls repo, throws domain errors
import { marketingRepo } from './marketing.repo.js';
import { ErrorCodes } from '../../errors/codes.js';

export const marketingService = {
  async findByStoreId(storeId: string, opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const [rows, totalResult] = await Promise.all([
      marketingRepo.findManyByStoreId(storeId, { limit, offset }),
      marketingRepo.countByStoreId(storeId),
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

  async findById(bannerId: string, storeId: string) {
    const banner = await marketingRepo.findById(bannerId, storeId);
    if (!banner) {
      throw Object.assign(new Error('Banner not found'), {
        code: ErrorCodes.BANNER_NOT_FOUND,
      });
    }
    return banner;
  },

  async create(data: {
    storeId: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    linkUrl?: string;
    position?: string;
    sortOrder?: number;
    isActive?: boolean;
    startDate?: Date;
    endDate?: Date;
  }) {
    const [banner] = await marketingRepo.create({
      storeId: data.storeId,
      title: data.title,
      subtitle: data.subtitle,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl,
      position: data.position ?? 'homepage_hero',
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
      startDate: data.startDate,
      endDate: data.endDate,
    });
    return banner;
  },

  async update(bannerId: string, storeId: string, data: Partial<{
    title: string;
    subtitle: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
    position: string;
    sortOrder: number;
    isActive: boolean;
    startDate: Date | null;
    endDate: Date | null;
  }>) {
    await this.findById(bannerId, storeId); // ensure exists

    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      updateData[key] = value;
    }

    const [updated] = await marketingRepo.update(bannerId, storeId, updateData as Parameters<typeof marketingRepo.update>[2]);
    return updated;
  },

  async delete(bannerId: string, storeId: string) {
    await this.findById(bannerId, storeId); // ensure exists
    await marketingRepo.deleteById(bannerId, storeId);
    return { id: bannerId, deleted: true };
  },

  async reorder(storeId: string, ids: string[]) {
    return marketingRepo.reorder(storeId, ids);
  },
};
