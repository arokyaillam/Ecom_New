// Merchant Modifiers Routes - CRUD for modifier groups and options
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { modifierService } from '../../services/modifier.service.js';

const listQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const createModifierGroupSchema = z.strictObject({
  productId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  applyTo: z.enum(['product', 'category']).default('product'),
  name: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
  isRequired: z.boolean().default(false),
  minSelections: z.number().int().min(0).default(1),
  maxSelections: z.number().int().min(1).default(1),
  sortOrder: z.number().int().default(0),
});

const updateModifierGroupSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).nullable().optional(),
  isRequired: z.boolean().optional(),
  minSelections: z.number().int().min(0).optional(),
  maxSelections: z.number().int().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

const createModifierOptionSchema = z.strictObject({
  nameEn: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
  priceAdjustment: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  imageUrl: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isAvailable: z.boolean().default(true),
});

const updateModifierOptionSchema = z.strictObject({
  nameEn: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).nullable().optional(),
  priceAdjustment: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  imageUrl: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isAvailable: z.boolean().optional(),
});

const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});

export default async function merchantModifiersRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/modifiers
  fastify.get('/', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await modifierService.findByStoreId(request.storeId, query);
    return result;
  });

  // GET /api/v1/merchant/modifiers/by-product?productId=...
  fastify.get('/by-product', async (request) => {
    const { productId } = z.strictObject({ productId: z.string().uuid() }).parse(request.query);
    const groups = await modifierService.findByProductId(productId, request.storeId);
    return { groups };
  });

  // POST /api/v1/merchant/modifiers
  fastify.post('/', async (request, reply) => {
    const parsed = createModifierGroupSchema.parse(request.body);
    const group = await modifierService.create({
      ...parsed,
      storeId: request.storeId,
    });
    reply.status(201).send({ group });
  });

  // GET /api/v1/merchant/modifiers/:id
  fastify.get('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const group = await modifierService.findById(id, request.storeId);
    return { group };
  });

  // PATCH /api/v1/merchant/modifiers/:id
  fastify.patch('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateModifierGroupSchema.parse(request.body);
    const group = await modifierService.update(id, request.storeId, parsed);
    return { group };
  });

  // DELETE /api/v1/merchant/modifiers/:id
  fastify.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await modifierService.delete(id, request.storeId);
    reply.status(204).send();
  });

  // --- Modifier Option routes ---

  // POST /api/v1/merchant/modifiers/:groupId/options
  fastify.post('/:groupId/options', async (request, reply) => {
    const { groupId } = z.strictObject({ groupId: z.string().uuid() }).parse(request.params);
    const parsed = createModifierOptionSchema.parse(request.body);
    const option = await modifierService.createOption({
      ...parsed,
      modifierGroupId: groupId,
      storeId: request.storeId,
    });
    reply.status(201).send({ option });
  });

  // PATCH /api/v1/merchant/modifiers/options/:optionId
  fastify.patch('/options/:optionId', async (request) => {
    const { optionId } = z.strictObject({ optionId: z.string().uuid() }).parse(request.params);
    const parsed = updateModifierOptionSchema.parse(request.body);
    const option = await modifierService.updateOption(optionId, request.storeId, parsed);
    return { option };
  });

  // DELETE /api/v1/merchant/modifiers/options/:optionId
  fastify.delete('/options/:optionId', async (request, reply) => {
    const { optionId } = z.strictObject({ optionId: z.string().uuid() }).parse(request.params);
    await modifierService.deleteOption(optionId, request.storeId);
    reply.status(204).send();
  });
}