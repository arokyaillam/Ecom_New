// Public Cart Routes - Guest cart operations (cookie-based)
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { carts, cartItems } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { ErrorCodes } from '../../errors/codes.js';

const addItemSchema = z.strictObject({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  modifiers: z.string().optional(),
});

const updateItemSchema = z.strictObject({
  quantity: z.number().int().min(1),
});

const itemIdParamSchema = z.strictObject({
  itemId: z.string().uuid(),
});

async function updateCartTotals(cartId: string) {
  const items = await db.query.cartItems.findMany({
    where: eq(cartItems.cartId, cartId),
  });

  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(2);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  await db
    .update(carts)
    .set({
      subtotal,
      total: subtotal,
      itemCount,
      updatedAt: new Date(),
    })
    .where(eq(carts.id, cartId));
}

export default async function publicCartRoutes(fastify: FastifyInstance) {
  // GET /api/v1/public/cart - Get or create cart
  fastify.get('/', async (request, reply) => {
    let cartId = request.cookies.cartId;

    if (cartId) {
      const cart = await db.query.carts.findFirst({
        where: eq(carts.id, cartId),
        with: { items: true },
      });

      if (cart) {
        return { cart };
      }
    }

    // Create a new cart
    const [newCart] = await db.insert(carts).values({
      storeId: request.storeId || '00000000-0000-0000-0000-000000000000',
      sessionId: crypto.randomUUID(),
      subtotal: '0',
      total: '0',
      itemCount: 0,
    }).returning();

    reply.setCookie('cartId', newCart.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return { cart: { ...newCart, items: [] } };
  });

  // POST /api/v1/public/cart/items - Add item to cart
  fastify.post('/items', async (request, reply) => {
    const parsed = addItemSchema.parse(request.body);
    let cartId = request.cookies.cartId;

    // Create cart if not exists
    if (!cartId) {
      const [newCart] = await db.insert(carts).values({
        storeId: request.storeId || '00000000-0000-0000-0000-000000000000',
        sessionId: crypto.randomUUID(),
        subtotal: '0',
        total: '0',
        itemCount: 0,
      }).returning();
      cartId = newCart.id;
      reply.setCookie('cartId', cartId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
    }

    // Check if item already exists in cart
    const existingItem = await db.query.cartItems.findFirst({
      where: and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.productId, parsed.productId),
      ),
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + parsed.quantity;
      const newTotal = (parseFloat(parsed.price) * newQuantity).toFixed(2);
      const [updated] = await db
        .update(cartItems)
        .set({
          quantity: newQuantity,
          total: newTotal,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existingItem.id))
        .returning();

      await updateCartTotals(cartId);

      const cart = await db.query.carts.findFirst({
        where: eq(carts.id, cartId),
        with: { items: true },
      });
      return { cart, item: updated };
    }

    // Add new item
    const itemTotal = (parseFloat(parsed.price) * parsed.quantity).toFixed(2);
    const [item] = await db.insert(cartItems).values({
      cartId,
      productId: parsed.productId,
      quantity: parsed.quantity,
      price: parsed.price,
      total: itemTotal,
      modifiers: parsed.modifiers,
    }).returning();

    await updateCartTotals(cartId);

    const cart = await db.query.carts.findFirst({
      where: eq(carts.id, cartId),
      with: { items: true },
    });
    return { cart, item };
  });

  // PATCH /api/v1/public/cart/items/:itemId - Update item quantity
  fastify.patch('/items/:itemId', async (request, reply) => {
    const { itemId } = itemIdParamSchema.parse(request.params);
    const parsed = updateItemSchema.parse(request.body);
    const cartId = request.cookies.cartId;

    if (!cartId) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.CART_NOT_FOUND, message: 'Cart not found' });
      return;
    }

    const item = await db.query.cartItems.findFirst({
      where: and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)),
    });

    if (!item) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.CART_ITEM_NOT_FOUND, message: 'Cart item not found' });
      return;
    }

    const newTotal = (parseFloat(item.price) * parsed.quantity).toFixed(2);
    const [updated] = await db
      .update(cartItems)
      .set({
        quantity: parsed.quantity,
        total: newTotal,
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, itemId))
      .returning();

    await updateCartTotals(cartId);

    const cart = await db.query.carts.findFirst({
      where: eq(carts.id, cartId),
      with: { items: true },
    });
    return { cart, item: updated };
  });

  // DELETE /api/v1/public/cart/items/:itemId - Remove item from cart
  fastify.delete('/items/:itemId', async (request, reply) => {
    const { itemId } = itemIdParamSchema.parse(request.params);
    const cartId = request.cookies.cartId;

    if (!cartId) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.CART_NOT_FOUND, message: 'Cart not found' });
      return;
    }

    await db.delete(cartItems).where(
      and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)),
    );

    await updateCartTotals(cartId);

    const cart = await db.query.carts.findFirst({
      where: eq(carts.id, cartId),
      with: { items: true },
    });
    return { cart };
  });
}