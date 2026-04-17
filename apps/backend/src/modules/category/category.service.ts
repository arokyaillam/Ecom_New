// Category service — business logic, calls repo, throws domain errors
import { categoryRepo } from './category.repo.js';
import { ErrorCodes } from '../../errors/codes.js';

export const categoryService = {
  async findByStoreId(
    storeId: string,
    options?: { limit?: number; offset?: number },
  ) {
    const [items, countResult] = await Promise.all([
      categoryRepo.findManyByStoreId(storeId, options),
      categoryRepo.countByStoreId(storeId),
    ]);

    const total = countResult[0]?.count ?? 0;

    return { items, total };
  },

  async findById(id: string, storeId: string) {
    const category = await categoryRepo.findById(id, storeId);

    if (!category) {
      throw Object.assign(new Error('Category not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return category;
  },

  async create(data: Parameters<typeof categoryRepo.create>[0]) {
    const [category] = await categoryRepo.create(data);

    if (!category) {
      throw Object.assign(new Error('Failed to create category'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return category;
  },

  async update(id: string, storeId: string, data: Parameters<typeof categoryRepo.update>[2]) {
    const [category] = await categoryRepo.update(id, storeId, data);

    if (!category) {
      throw Object.assign(new Error('Category not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return category;
  },

  async delete(id: string, storeId: string) {
    const [category] = await categoryRepo.delete(id, storeId);

    if (!category) {
      throw Object.assign(new Error('Category not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return category;
  },

  // --- Subcategory operations ---

  async createSubcategory(data: Parameters<typeof categoryRepo.createSubcategory>[0]) {
    const [subcategory] = await categoryRepo.createSubcategory(data);

    if (!subcategory) {
      throw Object.assign(new Error('Failed to create subcategory'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return subcategory;
  },

  async updateSubcategory(
    id: string,
    storeId: string,
    data: Parameters<typeof categoryRepo.updateSubcategory>[2],
  ) {
    const [subcategory] = await categoryRepo.updateSubcategory(id, storeId, data);

    if (!subcategory) {
      throw Object.assign(new Error('Subcategory not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return subcategory;
  },

  async deleteSubcategory(id: string, storeId: string) {
    const [subcategory] = await categoryRepo.deleteSubcategory(id, storeId);

    if (!subcategory) {
      throw Object.assign(new Error('Subcategory not found'), {
        code: ErrorCodes.CATEGORY_NOT_FOUND,
      });
    }

    return subcategory;
  },
};