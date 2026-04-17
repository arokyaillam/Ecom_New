// Merchant Modifiers Routes - CRUD for modifier groups and options
import { FastifyInstance } from 'fastify';
import { modifierService } from './modifier.service.js';
import { idParamSchema } from '../_shared/schema.js';
import { listQuerySchema, createModifierGroupSchema, updateModifierGroupSchema, createModifierOptionSchema, updateModifierOptionSchema, productIdQuerySchema, groupIdParamSchema, optionIdParamSchema } from './modifier.schema.js';

export default async function merchantModifiersRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/modifiers
  fastify.get('/', {
    schema: {
      tags: ['Merchant Modifiers'],
      summary: 'List modifier groups',
      description: 'List all modifier groups for the authenticated merchant store with pagination',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await modifierService.findByStoreId(request.storeId, query);
    return result;
  });

  // GET /api/v1/merchant/modifiers/by-product?productId=...
  fastify.get('/by-product', {
    schema: {
      tags: ['Merchant Modifiers'],
      summary: 'List modifiers by product',
      description: 'Retrieve all modifier groups applied to a specific product in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { productId } = productIdQuerySchema.parse(request.query);
    const groups = await modifierService.findByProductId(productId, request.storeId);
    return { groups };
  });

  // POST /api/v1/merchant/modifiers
  fastify.post('/', {
    schema: {
      tags: ['Merchant Modifiers'],
      summary: 'Create modifier group',
      description: 'Create a new modifier group in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = createModifierGroupSchema.parse(request.body);
    const group = await modifierService.create({
      ...parsed,
      storeId: request.storeId,
    });
    reply.status(201).send({ group });
  });

  // GET /api/v1/merchant/modifiers/:id
  fastify.get('/:id', {
    schema: {
      tags: ['Merchant Modifiers'],
      summary: 'Get modifier group detail',
      description: 'Retrieve a single modifier group by ID for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const group = await modifierService.findById(id, request.storeId);
    return { group };
  });

  // PATCH /api/v1/merchant/modifiers/:id
  fastify.patch('/:id', {
    schema: {
      tags: ['Merchant Modifiers'],
      summary: 'Update modifier group',
      description: 'Partial update of a modifier group in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateModifierGroupSchema.parse(request.body);
    const group = await modifierService.update(id, request.storeId, parsed);
    return { group };
  });

  // DELETE /api/v1/merchant/modifiers/:id
  fastify.delete('/:id', {
    schema: {
      tags: ['Merchant Modifiers'],
      summary: 'Delete modifier group',
      description: 'Delete a modifier group from the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await modifierService.delete(id, request.storeId);
    reply.status(204).send();
  });

  // --- Modifier Option routes ---

  // POST /api/v1/merchant/modifiers/:groupId/options
  fastify.post('/:groupId/options', {
    schema: {
      tags: ['Merchant Modifiers'],
      summary: 'Create modifier option',
      description: 'Add a new option to a modifier group in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { groupId } = groupIdParamSchema.parse(request.params);
    const parsed = createModifierOptionSchema.parse(request.body);
    const option = await modifierService.createOption({
      ...parsed,
      modifierGroupId: groupId,
      storeId: request.storeId,
    });
    reply.status(201).send({ option });
  });

  // PATCH /api/v1/merchant/modifiers/options/:optionId
  fastify.patch('/options/:optionId', {
    schema: {
      tags: ['Merchant Modifiers'],
      summary: 'Update modifier option',
      description: 'Partial update of a modifier option in the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { optionId } = optionIdParamSchema.parse(request.params);
    const parsed = updateModifierOptionSchema.parse(request.body);
    const option = await modifierService.updateOption(optionId, request.storeId, parsed);
    return { option };
  });

  // DELETE /api/v1/merchant/modifiers/options/:optionId
  fastify.delete('/options/:optionId', {
    schema: {
      tags: ['Merchant Modifiers'],
      summary: 'Delete modifier option',
      description: 'Delete a modifier option from the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { optionId } = optionIdParamSchema.parse(request.params);
    await modifierService.deleteOption(optionId, request.storeId);
    reply.status(204).send();
  });
}