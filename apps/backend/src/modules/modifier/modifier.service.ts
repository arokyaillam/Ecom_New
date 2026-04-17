// Modifier Service - CRUD for modifier groups with options
import { ErrorCodes } from '../../errors/codes.js';
import * as repo from './modifier.repo.js';

export const modifierService = {
  // --- Modifier Group operations ---

  async findByStoreId(
    storeId: string,
    options?: { limit?: number; offset?: number },
  ) {
    return repo.findGroupsByStoreId(storeId, options);
  },

  async findById(id: string, storeId: string) {
    const group = await repo.findGroupById(id, storeId);

    if (!group) {
      throw Object.assign(new Error('Modifier group not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return group;
  },

  async findByProductId(productId: string, storeId: string) {
    return repo.findGroupsByProductId(productId, storeId);
  },

  async create(data: typeof import('../../db/schema.js').modifierGroups.$inferInsert) {
    const group = await repo.insertGroup(data);

    if (!group) {
      throw Object.assign(new Error('Failed to create modifier group'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return group;
  },

  async update(
    id: string,
    storeId: string,
    data: Partial<typeof import('../../db/schema.js').modifierGroups.$inferInsert>,
  ) {
    const group = await repo.updateGroup(id, storeId, data);

    if (!group) {
      throw Object.assign(new Error('Modifier group not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return group;
  },

  async delete(id: string, storeId: string) {
    const group = await repo.deleteGroup(id, storeId);

    if (!group) {
      throw Object.assign(new Error('Modifier group not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return group;
  },

  // --- Modifier Option operations ---

  async findOptionById(id: string, storeId: string) {
    const option = await repo.findOptionById(id, storeId);

    if (!option) {
      throw Object.assign(new Error('Modifier option not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return option;
  },

  async createOption(data: typeof import('../../db/schema.js').modifierOptions.$inferInsert) {
    const option = await repo.insertOption(data);

    if (!option) {
      throw Object.assign(new Error('Failed to create modifier option'), {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return option;
  },

  async updateOption(
    id: string,
    storeId: string,
    data: Partial<typeof import('../../db/schema.js').modifierOptions.$inferInsert>,
  ) {
    const option = await repo.updateOption(id, storeId, data);

    if (!option) {
      throw Object.assign(new Error('Modifier option not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return option;
  },

  async deleteOption(id: string, storeId: string) {
    const option = await repo.deleteOption(id, storeId);

    if (!option) {
      throw Object.assign(new Error('Modifier option not found'), {
        code: ErrorCodes.MODIFIER_GROUP_NOT_FOUND,
      });
    }

    return option;
  },
};