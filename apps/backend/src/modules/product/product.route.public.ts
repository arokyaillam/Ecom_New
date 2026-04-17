// Public Products Routes - Browse and search published products
import { FastifyInstance } from 'fastify';
import { productListSchema, productSearchSchema, idParamSchema } from './product.schema.js';
import { productService } from './product.service.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function publicProductsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/public/products - List published products
  fastify.get('/', {
    schema: {
      tags: ['Public'],
      summary: 'List published products',
      description: 'Browse all published products for the current store with pagination',
    },
  }, async (request) => {
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

  // GET /api/v1/public/products/search - Search products
  fastify.get('/search', {
    schema: {
      tags: ['Public'],
      summary: 'Search products',
      description: 'Search and filter published products by name, description, tags, category, and price range',
    },
  }, async (request) => {
    if (!request.storeId) {
      return { items: [], total: 0, limit: 20, offset: 0 };
    }
    const query = productSearchSchema.parse(request.query);
    const result = await productService.search(request.storeId, {
      ...query,
      isPublished: true,
    });
    return result;
  });

  // GET /api/v1/public/products/:id - Get single published product
  fastify.get('/:id', {
    schema: {
      tags: ['Public'],
      summary: 'Get published product',
      description: 'Retrieve a single published product by ID for the current store',
    },
  }, async (request, reply) => {
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