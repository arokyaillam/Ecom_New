// Public Store Routes - Store info for storefront
import { FastifyInstance } from 'fastify';
import { storeService } from '../../services/store.service.js';

export default async function publicStoreRoutes(fastify: FastifyInstance) {
  // GET /api/v1/public/store - Get public store info
  fastify.get('/', async (request) => {
    // storeId is set by the public scope hook from domain resolution
    if (!request.storeId) {
      return { store: null, message: 'Store not found for this domain' };
    }

    const store = await storeService.findById(request.storeId);
    if (!store) {
      return { store: null, message: 'Store not found' };
    }

    // Strip sensitive owner fields
    const { ownerEmail, ownerName, ownerPhone, ...publicStore } = store;
    return { store: publicStore };
  });
}