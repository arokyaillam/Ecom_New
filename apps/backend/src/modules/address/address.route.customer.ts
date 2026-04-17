// Customer Addresses Routes - CRUD + set default
import { FastifyInstance } from 'fastify';
import { idParamSchema, createAddressSchema, updateAddressSchema } from './address.schema.js';
import { addressService } from './address.service.js';

export default async function customerAddressesRoutes(fastify: FastifyInstance) {
  // GET /api/v1/customer/addresses
  fastify.get('/', {
    schema: { tags: ['Customer Addresses'], summary: 'List addresses', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const addresses = await addressService.listAddresses(request.customerId!, request.storeId);
    return { addresses };
  });

  // POST /api/v1/customer/addresses
  fastify.post('/', {
    schema: { tags: ['Customer Addresses'], summary: 'Create address', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const parsed = createAddressSchema.parse(request.body);
    const address = await addressService.createAddress(request.customerId!, request.storeId, parsed);
    reply.status(201).send({ address });
  });

  // GET /api/v1/customer/addresses/:id
  fastify.get('/:id', {
    schema: { tags: ['Customer Addresses'], summary: 'Get address', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const address = await addressService.getAddress(id, request.customerId!, request.storeId);
    if (!address) return { address: null };
    return { address };
  });

  // PATCH /api/v1/customer/addresses/:id
  fastify.patch('/:id', {
    schema: { tags: ['Customer Addresses'], summary: 'Update address', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateAddressSchema.parse(request.body);
    const address = await addressService.updateAddress(id, request.customerId!, request.storeId, parsed);
    return { address };
  });

  // DELETE /api/v1/customer/addresses/:id
  fastify.delete('/:id', {
    schema: { tags: ['Customer Addresses'], summary: 'Delete address', security: [{ cookieAuth: [] }] },
  }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await addressService.deleteAddress(id, request.customerId!, request.storeId);
    reply.status(204).send();
  });

  // POST /api/v1/customer/addresses/:id/default
  fastify.post('/:id/default', {
    schema: { tags: ['Customer Addresses'], summary: 'Set default address', security: [{ cookieAuth: [] }] },
  }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const address = await addressService.setDefaultAddress(id, request.customerId!, request.storeId);
    return { address };
  });
}