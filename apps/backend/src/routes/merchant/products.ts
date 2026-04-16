// Merchant Products Routes - CRUD for products with variants
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { productService } from '../../services/product.service.js';

const createProductSchema = z.strictObject({
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional(),
  titleEn: z.string().min(1).max(255),
  titleAr: z.string().max(255).optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  salePrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  purchasePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  purchaseLimit: z.number().int().min(0).optional(),
  barcode: z.string().optional(),
  discountType: z.enum(['Percent', 'Fixed']).optional(),
  discount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currentQuantity: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  preparationTime: z.number().int().optional(),
  tags: z.string().optional(),
  images: z.string().optional(),
  youtubeVideoLinkId: z.string().optional(),
});

const updateProductSchema = z.strictObject({
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().nullable().optional(),
  titleEn: z.string().min(1).max(255).optional(),
  titleAr: z.string().max(255).nullable().optional(),
  descriptionEn: z.string().nullable().optional(),
  descriptionAr: z.string().nullable().optional(),
  salePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  purchasePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  purchaseLimit: z.number().int().min(0).nullable().optional(),
  barcode: z.string().nullable().optional(),
  discountType: z.enum(['Percent', 'Fixed']).optional(),
  discount: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  currentQuantity: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  preparationTime: z.number().int().nullable().optional(),
  tags: z.string().nullable().optional(),
  images: z.string().nullable().optional(),
  youtubeVideoLinkId: z.string().nullable().optional(),
});

const listQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  isPublished: z.enum(['true', 'false']).optional().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
});

const createVariantSchema = z.strictObject({
  nameEn: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
  sortOrder: z.number().int().default(0),
});

const updateVariantSchema = z.strictObject({
  nameEn: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const createVariantOptionSchema = z.strictObject({
  nameEn: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
  priceAdjustment: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  sku: z.string().optional(),
  stockQuantity: z.number().int().optional(),
  imageUrl: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isAvailable: z.boolean().default(true),
});

const updateVariantOptionSchema = z.strictObject({
  nameEn: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).nullable().optional(),
  priceAdjustment: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  sku: z.string().nullable().optional(),
  stockQuantity: z.number().int().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isAvailable: z.boolean().optional(),
});

const idParamSchema = z.strictObject({
  id: z.string().uuid(),
});

export default async function merchantProductsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/merchant/products
  fastify.get('/', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await productService.findByStoreId(request.storeId, query);
    return result;
  });

  // POST /api/v1/merchant/products
  fastify.post('/', async (request, reply) => {
    const parsed = createProductSchema.parse(request.body);
    const product = await productService.create({
      ...parsed,
      storeId: request.storeId,
    });
    reply.status(201).send({ product });
  });

  // GET /api/v1/merchant/products/:id
  fastify.get('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const product = await productService.findById(id, request.storeId);
    return { product };
  });

  // PATCH /api/v1/merchant/products/:id
  fastify.patch('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = updateProductSchema.parse(request.body);
    const product = await productService.update(id, request.storeId, parsed);
    return { product };
  });

  // DELETE /api/v1/merchant/products/:id
  fastify.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await productService.delete(id, request.storeId);
    reply.status(204).send();
  });

  // --- Variant routes ---

  // POST /api/v1/merchant/products/:id/variants
  fastify.post('/:id/variants', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const parsed = createVariantSchema.parse(request.body);
    const variant = await productService.createVariant({
      ...parsed,
      productId: id,
      storeId: request.storeId,
    });
    reply.status(201).send({ variant });
  });

  // PATCH /api/v1/merchant/products/:productId/variants/:variantId
  fastify.patch('/:productId/variants/:variantId', async (request) => {
    const { variantId } = z.strictObject({ variantId: z.string().uuid() }).parse(request.params);
    const parsed = updateVariantSchema.parse(request.body);
    const variant = await productService.updateVariant(variantId, request.storeId, parsed);
    return { variant };
  });

  // DELETE /api/v1/merchant/products/:productId/variants/:variantId
  fastify.delete('/:productId/variants/:variantId', async (request, reply) => {
    const { variantId } = z.strictObject({ variantId: z.string().uuid() }).parse(request.params);
    await productService.deleteVariant(variantId, request.storeId);
    reply.status(204).send();
  });

  // --- Variant option routes ---

  // POST /api/v1/merchant/products/:variantId/options
  fastify.post('/:variantId/options', async (request, reply) => {
    const { variantId } = z.strictObject({ variantId: z.string().uuid() }).parse(request.params);
    const parsed = createVariantOptionSchema.parse(request.body);
    const option = await productService.createVariantOption({
      ...parsed,
      variantId,
      storeId: request.storeId,
    });
    reply.status(201).send({ option });
  });

  // PATCH /api/v1/merchant/products/options/:optionId
  fastify.patch('/options/:optionId', async (request) => {
    const { optionId } = z.strictObject({ optionId: z.string().uuid() }).parse(request.params);
    const parsed = updateVariantOptionSchema.parse(request.body);
    const option = await productService.updateVariantOption(optionId, request.storeId, parsed);
    return { option };
  });

  // DELETE /api/v1/merchant/products/options/:optionId
  fastify.delete('/options/:optionId', async (request, reply) => {
    const { optionId } = z.strictObject({ optionId: z.string().uuid() }).parse(request.params);
    await productService.deleteVariantOption(optionId, request.storeId);
    reply.status(204).send();
  });
}