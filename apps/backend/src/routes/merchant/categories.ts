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
  fastify.get('/', {
    schema: {
      tags: ['Merchant Categories'],
      summary: 'List categories',
      description: 'List all categories for the authenticated merchant store with pagination',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await categoryService.findByStoreId(request.storeId, query);
    return result;
  });

  // POST /api/v1/merchant/categories
  fastify.post('/', {
    schema: {
      tags: ['Merchant Categories'],
      summary: 'Create category',
      description: 'Create a new category in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = createCategorySchema.parse(request.body);
    const category = await categoryService.create({
      ...parsed,
      storeId: request.storeId,
    });
    reply.status(201).send({ category });
  });

  // GET /api/v1/merchant/categories/:id
  fastify.get('/:id', {
    schema: {
      tags: ['Merchant Categories'],
      summary: 'Get category detail',
      description: 'Retrieve a single category by ID for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const category = await categoryService.findById(id, request.storeId);
    return { category };
  });

  // PATCH /api/v1/merchant/categories/:id
  fastify.patch('/:id', {
    schema: {
      tags: ['Merchant Categories'],
      summary: 'Update category',
      description: 'Partial update of a category in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateCategorySchema.parse(request.body);
    const category = await categoryService.update(id, request.storeId, parsed);
    return { category };
  });

  // DELETE /api/v1/merchant/categories/:id
  fastify.delete('/:id', {
    schema: {
      tags: ['Merchant Categories'],
      summary: 'Delete category',
      description: 'Delete a category from the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await categoryService.delete(id, request.storeId);
    reply.status(204).send();
  });

  // --- Subcategory routes ---

  // POST /api/v1/merchant/categories/:categoryId/subcategories
  fastify.post('/:categoryId/subcategories', {
    schema: {
      tags: ['Merchant Categories'],
      summary: 'Create subcategory',
      description: 'Add a new subcategory under a category in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
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
  fastify.patch('/:categoryId/subcategories/:subcategoryId', {
    schema: {
      tags: ['Merchant Categories'],
      summary: 'Update subcategory',
      description: 'Partial update of a subcategory in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const params = z.strictObject({ categoryId: z.string().uuid(), subcategoryId: z.string().uuid() }).parse(request.params);
    const parsed = updateSubcategorySchema.parse(request.body);
    const subcategory = await categoryService.updateSubcategory(params.subcategoryId, request.storeId, parsed);
    return { subcategory };
  });

  // DELETE /api/v1/merchant/categories/:categoryId/subcategories/:subcategoryId
  fastify.delete('/:categoryId/subcategories/:subcategoryId', {
    schema: {
      tags: ['Merchant Categories'],
      summary: 'Delete subcategory',
      description: 'Delete a subcategory from the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const params = z.strictObject({ categoryId: z.string().uuid(), subcategoryId: z.string().uuid() }).parse(request.params);
    await categoryService.deleteSubcategory(params.subcategoryId, request.storeId);
    reply.status(204).send();
  });
}