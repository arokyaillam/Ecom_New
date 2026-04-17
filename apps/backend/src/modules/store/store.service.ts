// Store service — business logic, calls repo, throws domain errors
import { storeRepo } from './store.repo.js';
import { ErrorCodes } from '../../errors/codes.js';

export const storeService = {
  async findById(storeId: string) {
    return storeRepo.findById(storeId);
  },

  async findByDomain(domain: string) {
    return storeRepo.findByDomain(domain);
  },

  async findByIdOrFail(storeId: string) {
    const store = await storeRepo.findById(storeId);
    if (!store) {
      throw Object.assign(new Error('Store not found'), {
        code: ErrorCodes.STORE_NOT_FOUND,
      });
    }
    return store;
  },

  async create(data: Parameters<typeof storeRepo.create>[0]) {
    const [store] = await storeRepo.create(data);
    return store;
  },

  async update(storeId: string, data: Parameters<typeof storeRepo.update>[1]) {
    const [store] = await storeRepo.update(storeId, data);
    return store;
  },

  async findByOwnerId(ownerEmail: string) {
    return storeRepo.findByOwnerId(ownerEmail);
  },
};