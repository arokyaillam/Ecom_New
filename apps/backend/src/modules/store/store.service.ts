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

  async getDomainConfig(storeId: string) {
    const store = await this.findByIdOrFail(storeId);
    return {
      subdomain: store.domain,
      customDomain: store.customDomain,
      customDomainVerified: store.customDomainVerified,
      customDomainVerifiedAt: store.customDomainVerifiedAt,
    };
  },

  async updateCustomDomain(storeId: string, customDomain: string) {
    const [store] = await storeRepo.update(storeId, {
      customDomain,
      customDomainVerified: false,
      customDomainVerifiedAt: null,
    });
    return store;
  },

  async verifyCustomDomain(storeId: string) {
    const [store] = await storeRepo.update(storeId, {
      customDomainVerified: true,
      customDomainVerifiedAt: new Date(),
    });
    return store;
  },
};