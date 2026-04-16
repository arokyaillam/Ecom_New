// Customer Checkout Routes - Place orders
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { orderService } from '../../services/order.service.js';

const checkoutSchema = z.strictObject({
  email: z.email(),
  phone: z.string().max(50).optional(),
  currency: z.string().max(3).default('USD'),
  items: z.array(z.strictObject({
    productId: z.string().uuid(),
    productTitle: z.string().min(1).max(500),
    productImage: z.string().optional(),
    variantName: z.string().max(255).optional(),
    quantity: z.number().int().min(1),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/),
    total: z.string().regex(/^\d+(\.\d{1,2})?$/),
    modifiers: z.string().optional(),
  })).min(1),
  cartId: z.string().uuid().optional(),
  billingName: z.string().max(255).optional(),
  billingFirstName: z.string().max(255).optional(),
  billingLastName: z.string().max(255).optional(),
  billingAddressLine1: z.string().max(500).optional(),
  billingAddressLine2: z.string().max(500).optional(),
  billingCity: z.string().max(255).optional(),
  billingState: z.string().max(255).optional(),
  billingCountry: z.string().max(255).optional(),
  billingPostalCode: z.string().max(20).optional(),
  shippingName: z.string().max(255).optional(),
  shippingFirstName: z.string().max(255).optional(),
  shippingLastName: z.string().max(255).optional(),
  shippingAddressLine1: z.string().max(500).optional(),
  shippingAddressLine2: z.string().max(500).optional(),
  shippingCity: z.string().max(255).optional(),
  shippingState: z.string().max(255).optional(),
  shippingCountry: z.string().max(255).optional(),
  shippingPostalCode: z.string().max(20).optional(),
  paymentMethod: z.string().max(50).optional(),
  couponId: z.string().uuid().optional(),
  couponCode: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});

export default async function customerCheckoutRoutes(fastify: FastifyInstance) {
  // POST /api/v1/customer/checkout - Create an order
  fastify.post('/', {
    schema: {
      tags: ['Customer Checkout'],
      summary: 'Place order',
      description: 'Create a new order from the cart for the authenticated customer',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parsed = checkoutSchema.parse(request.body);

    const subtotal = parsed.items.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(2);

    const order = await orderService.create({
      storeId: request.storeId,
      customerId: request.customerId,
      email: parsed.email,
      phone: parsed.phone,
      currency: parsed.currency,
      subtotal,
      total: subtotal,
      items: parsed.items,
      cartId: parsed.cartId,
      billingAddress: {
        billingName: parsed.billingName,
        billingFirstName: parsed.billingFirstName,
        billingLastName: parsed.billingLastName,
        billingAddressLine1: parsed.billingAddressLine1,
        billingAddressLine2: parsed.billingAddressLine2,
        billingCity: parsed.billingCity,
        billingState: parsed.billingState,
        billingCountry: parsed.billingCountry,
        billingPostalCode: parsed.billingPostalCode,
      },
      shippingAddress: {
        shippingName: parsed.shippingName,
        shippingFirstName: parsed.shippingFirstName,
        shippingLastName: parsed.shippingLastName,
        shippingAddressLine1: parsed.shippingAddressLine1,
        shippingAddressLine2: parsed.shippingAddressLine2,
        shippingCity: parsed.shippingCity,
        shippingState: parsed.shippingState,
        shippingCountry: parsed.shippingCountry,
        shippingPostalCode: parsed.shippingPostalCode,
      },
      paymentMethod: parsed.paymentMethod,
      couponId: parsed.couponId,
      couponCode: parsed.couponCode,
      notes: parsed.notes,
    });

    reply.status(201).send({ order });
  });
}