// Customer Wishlist Routes - Add/remove wishlist items
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { wishlists } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { ErrorCodes } from '../../errors/codes.js';

const addWishlistSchema = z.strictObject({
  productId: z.string().uuid(),
});

export default async function customerWishlistRoutes(fastify: FastifyInstance) {
  // GET /api/v1/customer/wishlist - Get customer's wishlist
  fastify.get('/', async (request) => {
    const items = await db.query.wishlists.findMany({
      where: eq(wishlists.customerId, request.customerId!),
      with: {
        product: true,
      },
    });
    return { wishlist: items };
  });

  // POST /api/v1/customer/wishlist - Add item to wishlist
  fastify.post('/', async (request, reply) => {
    const parsed = addWishlistSchema.parse(request.body);

    // Check if already in wishlist
    const existing = await db.query.wishlists.findFirst({
      where: and(
        eq(wishlists.customerId, request.customerId!),
        eq(wishlists.productId, parsed.productId),
      ),
    });

    if (existing) {
      reply.status(409).send({
        error: 'Conflict',
        code: ErrorCodes.WISHLIST_ITEM_EXISTS,
        message: 'Product already in wishlist',
      });
      return;
    }

    const [item] = await db.insert(wishlists).values({
      customerId: request.customerId!,
      storeId: request.storeId,
      productId: parsed.productId,
    }).returning();

    reply.status(201).send({ wishlistItem: item });
  });

  // DELETE /api/v1/customer/wishlist/:productId - Remove from wishlist
  fastify.delete('/:productId', async (request, reply) => {
    const { productId } = z.strictObject({ productId: z.string().uuid() }).parse(request.params);

    await db.delete(wishlists).where(
      and(
        eq(wishlists.customerId, request.customerId!),
        eq(wishlists.productId, productId),
      ),
    );

    reply.status(204).send();
  });
}