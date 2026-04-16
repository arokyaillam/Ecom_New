// Merchant Categories Routes - CRUD for categories and subcategories
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { categoryService } from '../../services/category.service.js';

const createCategorySchema = z.strictObject({
  nameEn: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
});

const updateCategorySchema = z.strictObject({
  nameEn: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).nullable().optional(),
});

const listQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const createSubcategorySchema = z.strictObject({
  nameEn: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
});

const updateSubcategorySchema = z.strictObject({
  nameEn: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).nullable().optional(),
});

const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});

export default async function merchantCategoriesRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/categories
  fastify.get('/', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await categoryService.findByStoreId(request.storeId, query);
    return result;
  });

  // POST /api/v1/merchant/categories
  fastify.post('/', async (request, reply) => {
    const parsed = createCategorySchema.parse(request.body);
    const category = await categoryService.create({
      ...parsed,
      storeId: request.storeId,
    });
    reply.status(201).send({ category });
  });

  // GET /api/v1/merchant/categories/:id
  fastify.get('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const category = await categoryService.findById(id, request.storeId);
    return { category };
  });

  // PATCH /api/v1/merchant/categories/:id
  fastify.patch('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateCategorySchema.parse(request.body);
    const category = await categoryService.update(id, request.storeId, parsed);
    return { category };
  });

  // DELETE /api/v1/merchant/categories/:id
  fastify.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await categoryService.delete(id, request.storeId);
    reply.status(204).send();
  });

  // --- Subcategory routes ---

  // POST /api/v1/merchant/categories/:categoryId/subcategories
  fastify.post('/:categoryId/subcategories', async (request, reply) => {
    const params = z.strictObject({ categoryId: z.string().uuid() }).parse(request.params);
    const parsed = createSubcategorySchema.parse(request.body);
    const subcategory = await categoryService.createSubcategory({
      ...parsed,
      categoryId: params.categoryId,
      storeId: request.storeId,
    });
    reply.status(201).send({ subcategory });
  });

  // PATCH /api/v1/merchant/categories/:categoryId/subcategories/:subcategoryId
  fastify.patch('/:categoryId/subcategories/:subcategoryId', async (request) => {
    const params = z.strictObject({ categoryId: z.string().uuid(), subcategoryId: z.string().uuid() }).parse(request.params);
    const parsed = updateSubcategorySchema.parse(request.body);
    const subcategory = await categoryService.updateSubcategory(params.subcategoryId, request.storeId, parsed);
    return { subcategory };
  });

  // DELETE /api/v1/merchant/categories/:categoryId/subcategories/:subcategoryId
  fastify.delete('/:categoryId/subcategories/:subcategoryId', async (request, reply) => {
    const params = z.strictObject({ categoryId: z.string().uuid(), subcategoryId: z.string().uuid() }).parse(request.params);
    await categoryService.deleteSubcategory(params.subcategoryId, request.storeId);
    reply.status(204).send();
  });
}