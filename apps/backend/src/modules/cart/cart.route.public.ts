// Public Cart Routes - Guest cart operations (cookie-based)
// All inline DB queries replaced with cartService method calls.
import { FastifyInstance } from 'fastify';
import { addItemSchema, updateItemSchema, itemIdParamSchema } from './cart.schema.js';
import { cartService } from './cart.service.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function publicCartRoutes(fastify: FastifyInstance) {
  // GET /api/v1/public/cart - Get or create cart
  fastify.get('/', {
    schema: {
      tags: ['Public'],
      summary: 'Get or create cart',
      description: 'Retrieve the current guest cart or create a new one using a cookie-based session',
    },
  }, async (request, reply) => {
    if (!request.storeId) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found. Please access via your store domain.' });
      return;
    }

    const cartId = request.cookies.cartId;
    const { cart, isNew } = await cartService.getOrCreateCart(cartId, request.storeId);

    if (isNew) {
      reply.setCookie('cartId', cart.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
    }

    return { cart };
  });

  // POST /api/v1/public/cart/items - Add item to cart
  fastify.post('/items', {
    schema: {
      tags: ['Public'],
      summary: 'Add item to cart',
      description: 'Add a product item to the guest cart with server-side price verification. Prices are computed from the database.',
    },
  }, async (request, reply) => {
    if (!request.storeId) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found. Please access via your store domain.' });
      return;
    }

    const parsed = addItemSchema.parse(request.body);
    let cartId = request.cookies.cartId;

    // Create cart if not exists
    if (!cartId) {
      const { cart, isNew } = await cartService.getOrCreateCart(undefined, request.storeId);
      cartId = cart.id;
      if (isNew) {
        reply.setCookie('cartId', cartId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        });
      }
    }

    const result = await cartService.addItem(cartId, request.storeId, {
      productId: parsed.productId,
      quantity: parsed.quantity,
      variantOptionIds: parsed.variantOptionIds,
      combinationKey: parsed.combinationKey,
      modifierOptionIds: parsed.modifierOptionIds,
    });

    return result;
  });

  // PATCH /api/v1/public/cart/items/:itemId - Update item quantity
  fastify.patch('/items/:itemId', {
    schema: {
      tags: ['Public'],
      summary: 'Update cart item quantity',
      description: 'Update the quantity of a specific item in the guest cart',
    },
  }, async (request, reply) => {
    const { itemId } = itemIdParamSchema.parse(request.params);
    const parsed = updateItemSchema.parse(request.body);
    const cartId = request.cookies.cartId;

    if (!cartId) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.CART_NOT_FOUND, message: 'Cart not found' });
      return;
    }

    try {
      const result = await cartService.updateItemQuantity(cartId, itemId, parsed.quantity, request.storeId);
      return result;
    } catch (err: any) {
      if (err.code === ErrorCodes.CART_ITEM_NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: ErrorCodes.CART_ITEM_NOT_FOUND, message: 'Cart item not found' });
        return;
      }
      throw err;
    }
  });

  // DELETE /api/v1/public/cart/items/:itemId - Remove item from cart
  fastify.delete('/items/:itemId', {
    schema: {
      tags: ['Public'],
      summary: 'Remove cart item',
      description: 'Remove a specific item from the guest cart',
    },
  }, async (request, reply) => {
    const { itemId } = itemIdParamSchema.parse(request.params);
    const cartId = request.cookies.cartId;

    if (!cartId) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.CART_NOT_FOUND, message: 'Cart not found' });
      return;
    }

    const result = await cartService.removeItem(cartId, itemId, request.storeId);
    return result;
  });
}