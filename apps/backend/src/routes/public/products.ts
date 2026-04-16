// Public Products Routes - Browse published products
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { productService } from '../../services/product.service.js';
import { ErrorCodes } from '../../errors/codes.js';

const productListSchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});

export default async function publicProductsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/public/products - List published products
  fastify.get('/', async (request) => {
    if (!request.storeId) {
      return { items: [], total: 0 };
    }
    const query = productListSchema.parse(request.query);
    const result = await productService.findByStoreId(request.storeId, {
      ...query,
      isPublished: true,
    });
    return result;
  });

  // GET /api/v1/public/products/:id - Get single published product
  fastify.get('/:id', async (request, reply) => {
    if (!request.storeId) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found' });
      return;
    }
    const { id } = idParamSchema.parse(request.params);
    try {
      const product = await productService.findById(id, request.storeId);
      if (!product.isPublished) {
        reply.status(404).send({ error: 'Not Found', code: ErrorCodes.PRODUCT_NOT_FOUND, message: 'Product not found' });
        return;
      }
      return { product };
    } catch {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.PRODUCT_NOT_FOUND, message: 'Product not found' });
    }
  });
}