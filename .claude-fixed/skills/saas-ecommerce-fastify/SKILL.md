---
name: saas-ecommerce-fastify
description: Build secure, multi-tenant headless ecommerce SaaS platforms using Fastify TypeScript with Drizzle ORM. Use this skill for any Fastify-based ecommerce project, authentication systems with scope-based access control, multi-tenant architectures, or when implementing Routes+Services patterns. Handles 4-scope authentication (public, merchant, customer, superAdmin), Fastify encapsulation, security best practices, and database schema design with PostgreSQL.
---

# SaaS E-commerce Fastify Skill

## Overview

This skill provides comprehensive guidance for building multi-tenant headless ecommerce SaaS platforms using Fastify, TypeScript, Drizzle ORM, and PostgreSQL.

## Architecture Patterns

### 1. Four Scopes Only

The application has exactly 4 authentication scopes:

1. **public** - No authentication required (storefront, product browsing)
2. **merchant** - Store owners and staff (manage products, orders, settings)
3. **customer** - Registered customers (wishlist, orders, reviews)
4. **superAdmin** - Platform administrators (merchant approval, plans, analytics)

### 2. Fastify Encapsulation Pattern

Encapsulation is the core of Fastify's plugin system. Each scope is a separate encapsulated context:

```typescript
// scopes/merchant.ts - Encapsulated merchant scope
import { FastifyInstance } from 'fastify';

export default async function merchantScope(fastify: FastifyInstance, opts: any) {
  // All hooks registered here are encapsulated to merchant routes only
  
  // Authentication hook - runs on all merchant routes
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      const decoded = await request.jwtVerify();
      
      // Verify storeId from JWT
      if (!decoded.storeId) {
        reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token' });
        return;
      }
      
      // Check store status (NEVER skip this)
      const store = await fastify.storeService.getStore(decoded.storeId);
      if (!store) {
        reply.status(404).send({ error: 'Not Found', message: 'Store not found' });
        return;
      }
      if (store.status !== 'active') {
        reply.status(403).send({ error: 'Forbidden', message: `Store is ${store.status}` });
        return;
      }
      
      // Attach to request for route handlers
      request.storeId = decoded.storeId;
      request.userId = decoded.userId;
      request.userRole = decoded.role;
      
    } catch (err) {
      fastify.log.warn({ err }, 'Authentication failed');
      reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token' });
      return;
    }
  });
  
  // Register merchant routes
  fastify.register(import('../routes/merchant/auth'), { prefix: '/auth' });
  fastify.register(import('../routes/merchant/products'), { prefix: '/products' });
  fastify.register(import('../routes/merchant/orders'), { prefix: '/orders' });
  fastify.register(import('../routes/merchant/categories'), { prefix: '/categories' });
  fastify.register(import('../routes/merchant/modifiers'), { prefix: '/modifiers' });
  fastify.register(import('../routes/merchant/customers'), { prefix: '/customers' });
  fastify.register(import('../routes/merchant/reviews'), { prefix: '/reviews' });
  fastify.register(import('../routes/merchant/coupons'), { prefix: '/coupons' });
  fastify.register(import('../routes/merchant/analytics'), { prefix: '/analytics' });
  fastify.register(import('../routes/merchant/upload'), { prefix: '/upload' });
  
}
```

**Key Principle**: Hooks defined in scope files are encapsulated. They run ONLY on routes registered within that scope. NEVER use inline `preHandler` in route files.

### 3. Scope Registration in Main File

```typescript
// index.ts - Main application entry (max 60 lines)
import Fastify from 'fastify';
import { env } from './config/env';  // Validates env vars at startup
import plugins from './plugins';
import publicScope from './scopes/public';
import merchantScope from './scopes/merchant';
import customerScope from './scopes/customer';
import superAdminScope from './scopes/superAdmin';

const fastify = Fastify({
  logger: { level: env.LOG_LEVEL },
  trustProxy: true  // Required when behind reverse proxy (nginx, cloudflare, etc.)
});

// Register plugins first
await fastify.register(plugins);

// Register scopes (each is encapsulated)
await fastify.register(publicScope, { prefix: '/api/v1/public' });
await fastify.register(merchantScope, { prefix: '/api/v1/merchant' });
await fastify.register(customerScope, { prefix: '/api/v1/customer' });
await fastify.register(superAdminScope, { prefix: '/api/v1/admin' });

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: Number(env.PORT), host: env.HOST });
    fastify.log.info(`Server listening on port ${env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

### 4. Routes + Services Pattern

**Route files** handle HTTP only - validation, request/response formatting.
**Service files** handle business logic - database operations, calculations, external API calls.

```typescript
// routes/merchant/products.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { productService } from '../../services/product.service';

const createProductSchema = z.strictObject({
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional(),
  titleEn: z.string().min(1).max(255),
  titleAr: z.string().max(255).optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  salePrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  purchasePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currentQuantity: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export default async function merchantProductsRoutes(fastify: FastifyInstance) {
  
  // GET /api/v1/merchant/products
  fastify.get('/', async (request, reply) => {
    const products = await productService.findByStoreId(request.storeId);
    return { products };
  });
  
  // POST /api/v1/merchant/products
  fastify.post('/', {
    schema: {
      body: createProductSchema
    }
  }, async (request, reply) => {
    const product = await productService.create({
      ...request.body,
      storeId: request.storeId
    });
    reply.status(201).send({ product });
  });
  
  // GET /api/v1/merchant/products/:id
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const product = await productService.findById(id, request.storeId);
    
    if (!product) {
      return reply.status(404).send({ error: 'Not Found', message: 'Product not found' });
    }
    
    return { product };
  });
}
```

```typescript
// services/product.service.ts
import { db } from '../db';
import { products, productVariants, categories } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const productService = {
  async findByStoreId(storeId: string) {
    return db.query.products.findMany({
      where: eq(products.storeId, storeId),
      with: {
        category: true,
        variants: true
      },
      orderBy: desc(products.sortOrder)
    });
  },
  
  async create(data: CreateProductInput) {
    const [product] = await db.insert(products)
      .values(data)
      .returning();
    return product;
  },
  
  async findById(id: string, storeId: string) {
    return db.query.products.findFirst({
      where: and(
        eq(products.id, id),
        eq(products.storeId, storeId)
      ),
      with: {
        category: true,
        variants: {
          with: {
            options: true
          }
        },
        modifierGroups: {
          with: {
            options: true
          }
        }
      }
    });
  }
};
```

## Security Best Practices

### 1. Zod Validation on Every Route

```typescript
const schema = z.strictObject({
  email: z.email(),  // Zod 4 top-level validator
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
});  // strictObject() rejects unknown keys automatically
```

### 2. Never Trust Client Content-Type

```typescript
import { fileTypeFromBuffer } from 'file-type';

// Upload service - ALWAYS validate actual file content
async function validateUpload(buffer: Buffer, allowedTypes: string[]) {
  const fileType = await fileTypeFromBuffer(buffer);
  
  if (!fileType || !allowedTypes.includes(fileType.mime)) {
    throw new Error('Invalid file type');
  }
  
  return fileType;
}
```

### 3. JWT in httpOnly Cookies

```typescript
// CORRECT - Token in httpOnly cookie
async function login(request, reply) {
  const user = await authService.validateCredentials(request.body);
  const token = await reply.jwtSign({ 
    userId: user.id, 
    storeId: user.storeId,
    role: user.role 
  });
  
  reply.setCookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 // 7 days (in seconds)
  });
  
  return { success: true };  // NEVER return token in body
}

// INCORRECT - NEVER do this
return { token };  // ❌ Security vulnerability
```

### 4. Bcrypt Password Handling

```typescript
import bcrypt from 'bcrypt';

// CORRECT - Never pre-sanitize password
const isValid = await bcrypt.compare(password, user.password);

// INCORRECT
const sanitized = password.trim().toLowerCase();  // ❌ Never do this
await bcrypt.compare(sanitized, user.password);
```

### 5. Store Status Check

```typescript
// This is done in scope hooks, NEVER skip
if (store.status === 'suspended') {
  reply.status(403).send({ error: 'Forbidden', message: 'Store suspended' });
  return;
}
```

### 6. Never Expose Owner Information

```typescript
// INCORRECT - Never include in public API
return {
  ...store,
  ownerEmail: store.ownerEmail,  // ❌ Security leak
  ownerPhone: store.ownerPhone     // ❌ Security leak
};

// CORRECT - Filter sensitive fields
const { ownerEmail, ownerName, ownerPhone, ...publicStore } = store;
return publicStore;
```

## Database Patterns

### 1. Drizzle ORM Only - No Raw SQL

```typescript
// CORRECT - Use Drizzle ORM
const result = await db.select().from(products).where(eq(products.id, id));

// INCORRECT - Never use raw SQL
const result = await db.execute(`SELECT * FROM products WHERE id = '${id}'`);  // ❌ SQL injection risk
```

### 2. Batch Queries with inArray()

```typescript
import { inArray } from 'drizzle-orm';

// CORRECT - Batch fetch
const productList = await db.query.products.findMany({
  where: inArray(products.id, productIds)
});

// INCORRECT - N+1 query
const productList = [];
for (const id of productIds) {  // ❌ N+1 query
  const product = await db.query.products.findFirst({
    where: eq(products.id, id)
  });
  productList.push(product);
}
```

### 3. StoreId from JWT, Never from Body

```typescript
// CORRECT - Get storeId from JWT (set in scope hook)
fastify.post('/', async (request, reply) => {
  const product = await productService.create({
    ...request.body,
    storeId: request.storeId  // From JWT, not body
  });
});

// INCORRECT
fastify.post('/', async (request, reply) => {
  const product = await productService.create({
    ...request.body,
    storeId: request.body.storeId  // ❌ Client could pass any storeId
  });
});
```

## Latest Package Versions (April 2026)

```json
{
  "dependencies": {
    "fastify": "^5.8.4",
    "fastify-plugin": "^5.1.0",
    "@fastify/jwt": "^10.0.0",
    "@fastify/cors": "^11.2.0",
    "@fastify/cookie": "^11.0.2",
    "@fastify/rate-limit": "^10.3.0",
    "@fastify/swagger": "^9.7.0",
    "@fastify/swagger-ui": "^5.2.5",
    "@fastify/helmet": "^13.0.2",
    "@fastify/compress": "^8.3.1",
    "@fastify/sensible": "^6.0.4",
    "drizzle-orm": "^0.45.2",
    "postgres": "^3.4.9",
    "zod": "^4.0.0",
    "bcrypt": "^6.0.0",
    "bullmq": "^5.73.5",
    "ioredis": "^5.6.1",
    "file-type": "^22.0.0",
    "resend": "^6.11.0",
    "dotenv": "^17.4.2"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0",
    "typescript": "^5.8.0"
  }
}
```

### Important Version Notes

- **Zod 4.0.0**: Released July 2025. Has breaking changes - unified error API, new metadata system
- **file-type v22**: Requires Node.js 22+. Use v20.5.0 if on Node 20
- **resend v6**: 2 major versions ahead of v4 - check migration guide
- **bullmq v5.73**: Significant updates from v5.0 - new features for job deduplication

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Database Schema Reference

See the complete schema at `references/database-schema.ts` which includes:
- superAdmins, merchantPlans
- stores (with theme customization fields)
- users, customers, customerAddresses
- categories, subcategories
- products, productVariants, productVariantOptions, productVariantCombinations
- modifierGroups, modifierOptions
- orders, orderItems
- reviews, coupons, wishlists
- carts, cartItems
- emailTemplates, activityLogs, storeAnalytics

## Common Patterns

### 1. Creating a New Merchant Route

```typescript
// 1. Create scope file in scopes/merchant.ts (already exists)
// 2. Create route file in routes/merchant/newFeature.ts
// 3. Register in scope file:
fastify.register(import('../routes/merchant/newFeature'), { prefix: '/new-feature' });

// 4. Create service in services/newFeature.service.ts
// 5. Export from services/index.ts if needed
```

### 2. Adding a New Database Table

```typescript
// 1. Add table to db/schema.ts
export const newTable = pgTable("new_table", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  // ... fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Run migration
// npx drizzle-kit generate
// npx drizzle-kit migrate

// 3. Create service
// 4. Create routes
```

### 3. Error Response Format

Always use this format (include `code` from `errors/codes.ts`):

```typescript
import { ErrorCodes } from '../../errors/codes';

// Simple error
reply.status(400).send({ 
  error: 'Bad Request',
  code: ErrorCodes.VALIDATION_ERROR,
  message: 'Invalid input' 
});

// Not found
reply.status(404).send({ 
  error: 'Not Found',
  code: ErrorCodes.PRODUCT_NOT_FOUND,
  message: 'Product not found' 
});

// Unauthorized
reply.status(401).send({ 
  error: 'Unauthorized',
  code: ErrorCodes.INVALID_CREDENTIALS,
  message: 'Authentication required' 
});

// Forbidden
reply.status(403).send({ 
  error: 'Forbidden',
  code: ErrorCodes.STORE_SUSPENDED,
  message: 'Store is suspended' 
});
```

## File Structure

```
apps/backend/
├── src/
│   ├── config/
│   │   └── env.ts             ← Environment validation (Zod)
│   ├── types/
│   │   └── fastify.d.ts       ← Request type augmentation
│   ├── errors/
│   │   └── codes.ts           ← Standardized error codes
│   ├── plugins/
│   │   ├── cors.ts
│   │   ├── jwt.ts
│   │   ├── rateLimit.ts
│   │   ├── swagger.ts
│   │   ├── redis.ts
│   │   ├── compress.ts
│   │   └── index.ts
│   ├── scopes/
│   │   ├── public.ts
│   │   ├── merchant.ts        ← Encapsulation + hooks
│   │   ├── customer.ts        ← Encapsulation + hooks
│   │   └── superAdmin.ts      ← Encapsulation + hooks
│   ├── middleware/
│   │   └── tenant.ts
│   ├── services/
│   │   ├── cache.service.ts
│   │   ├── queue.service.ts
│   │   ├── email.service.ts
│   │   ├── upload.service.ts
│   │   └── *.service.ts
│   ├── routes/
│   │   ├── public/
│   │   ├── merchant/
│   │   ├── customer/
│   │   └── superAdmin/
│   ├── db/
│   │   ├── schema.ts          ← Copy exactly, no changes
│   │   └── index.ts
│   └── index.ts               ← Max 60 lines
├── drizzle/
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

## Pre-Completion Checklist

BEFORE marking any task complete, verify ALL of these:

- [ ] **No console.log anywhere** - Use `fastify.log.debug()`, `fastify.log.info()`, `fastify.log.warn()`, `fastify.log.error()` only
- [ ] **No `any` type** - TypeScript strict mode; no `any` except documented exceptions
- [ ] **No inline preHandler** - Hooks defined only in scope files, NEVER inline `preHandler` in route files
- [ ] **Zod strictObject() on every route body** - All body schemas use `z.strictObject()` (Zod 4) to reject unknown keys
- [ ] **ownerEmail/ownerName not in public responses** - Filter sensitive store fields: `const { ownerEmail, ownerName, ownerPhone, ...publicStore } = store`
- [ ] **JWT in httpOnly cookie** - `reply.setCookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' })` - NEVER return in response body
- [ ] **storeId from request.user** - Get storeId from JWT (via scope hook), NEVER from request body/query params
- [ ] **No require()** - ESM imports only; top-level imports, no dynamic require/import inside functions
- [ ] **fastify.log.* for logging** - All logging through Fastify logger, never console (exception: standalone CLI scripts like seed files)
- [ ] **Redis for caching + queues** - Use ioredis for caching and BullMQ for queues, never in-memory
- [ ] **Seed file has NODE_ENV guard** - Database seed files check `NODE_ENV !== 'production'` before running
- [ ] **FastifyRequest types declared** - `types/fastify.d.ts` declares `storeId`, `userId`, `userRole` etc. on `FastifyRequest`
- [ ] **Environment variables validated** - All env vars validated with Zod schema in `config/env.ts`
- [ ] **Error codes used** - Use standardized error codes from `errors/codes.ts` in all error responses

## References

- `references/database-schema.ts` - Complete Drizzle schema
- `references/scope-examples.md` - More scope patterns
- `references/service-patterns.md` - Service layer patterns

- `references/checklist-explained.md` - Detailed checklist with examples

---

## 🚀 2025 Modern Best Practices (Newly Added)

Based on latest industry research and Fastify v5.5+ documentation.

### 1. Multi-Tenant Security with RLS (Row-Level Security)

Add PostgreSQL RLS for defense-in-depth beyond application-level checks:

```sql
-- Enable RLS on tenant tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (critical!)
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- Create tenant isolation policy
CREATE POLICY tenant_isolation_policy ON orders
  FOR ALL
  USING (store_id = current_setting('app.current_tenant')::uuid);
```

In your scope hook:

> **Note:** This is an allowed exception to the "No Raw SQL" rule. PostgreSQL RLS context (`SET LOCAL`) has no Drizzle ORM equivalent and requires `db.execute(sql`...`)`. This is the ONLY place raw SQL is permitted.

```typescript
fastify.addHook('onRequest', async (request, reply) => {
  const decoded = await request.jwtVerify();
  request.storeId = decoded.storeId;
  
  // Set RLS context for this request (raw SQL exception - no Drizzle equivalent)
  await db.execute(
    sql`SET LOCAL app.current_tenant = ${request.storeId}`
  );
});
```

### 2. Zod 4 Migration (Released July 2025)

**Breaking Changes:**
- `message` -> `error` parameter unified
- Top-level format validators: `z.email()` instead of `z.string().email()`
- `strictObject()` instead of `.strict()`

```typescript
// Zod 4
import { z } from 'zod';

const schema = z.strictObject({
  email: z.email(),  // Top-level validator
  name: z.string()
});  // strictObject() already rejects unknown keys - no need for .strict()
```

### 3. Checkout Architecture - Saga Pattern

For multi-step checkout (inventory, payment, order creation):

```typescript
// services/checkout.service.ts
export const checkoutService = {
  async processCheckout(data: CheckoutData) {
    return await db.transaction(async (tx) => {
      // Step 1: Reserve inventory
      const reserved = await this.reserveInventory(tx, data.items);
      if (!reserved) throw new Error('Insufficient inventory');
      
      // Step 2: Create payment intent
      const paymentIntent = await paymentService.createIntent(data);
      
      // Step 3: Create order
      const order = await this.createOrder(tx, {
        ...data,
        paymentIntentId: paymentIntent.id,
        status: 'pending'
      });
      
      // Step 4: Queue confirmation email (async)
      await emailQueue.add('order-confirmation', { orderId: order.id });
      
      return order;
    });
  }
};
```

### 4. API Rate Limiting - Per-Tenant Token Bucket

Use Redis with token bucket algorithm:

```typescript
// plugins/rateLimit.ts
const luaScript = `
  local key = KEYS[1]
  local cost = tonumber(ARGV[1])
  local bucketSize = tonumber(ARGV[2])
  local refillRate = tonumber(ARGV[3])
  local now = redis.call('TIME')[1]
  
  local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
  local tokens = tonumber(bucket[1]) or bucketSize
  local lastRefill = tonumber(bucket[2]) or now
  
  local delta = now - lastRefill
  tokens = math.min(bucketSize, tokens + (delta * refillRate))
  
  if tokens >= cost then
    tokens = tokens - cost
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, 60)
    return 1
  else
    return 0
  end
`;

const allowed = await redis.eval(luaScript, 1, key, cost, bucketSize, refillRate);
```

### 5. Webhook Security - HMAC Verification

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

async function verifySignature(payload: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}
```

### 6. Redis Caching - Cache-Aside with Stampede Protection

```typescript
async function getOrSet<T>(key: string, fn: () => Promise<T>, ttl: number = 300): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  // Distributed lock to prevent cache stampede
  const lockKey = key + ':lock';
  const acquired = await redis.set(lockKey, '1', 'EX', 30, 'NX');
  
  if (!acquired) {
    await new Promise(r => setTimeout(r, 100));
    return getOrSet(key, fn, ttl);
  }
  
  try {
    const data = await fn();
    const jitter = Math.floor(Math.random() * ttl * 0.1);
    await redis.setex(key, ttl + jitter, JSON.stringify(data));
    return data;
  } finally {
    await redis.del(lockKey);
  }
}
```

### 7. Fastify v5.5+ Error Handling

```typescript
import createError from '@fastify/error';

const CustomError = createError('CUSTOM_ERROR', 'Something went wrong', 500);

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  
  if (error instanceof CustomError) {
    reply.status(error.statusCode).send({ error: error.code, message: error.message });
    return;
  }
  
  reply.status(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message
  });
});
```

---

**Sources:**
- Fastify Encapsulation v5.5 (fastify.dev)
- Multi-Tenant SaaS Security 2026 (ZeonEdge)
- Zod 4 Migration (zod.dev)
- Drizzle ORM Best Practices (drizzle.team)
- E-commerce Checkout Architecture (Medium)
- API Rate Limiting Strategies 2026 (Ekolsoft)
- Webhook Security 2025-2026 (DEV Community)
- Redis Caching Patterns (ScaledByDesign)

---

## N+1 Query Prevention - Complete Guide

The N+1 query problem is the #1 performance killer in ORM applications. This section covers how to completely eliminate it in your SaaS e-commerce platform.

### Understanding the Problem

**N+1 Example (BAD):**
```typescript
// ❌ BAD: 1 + N queries
const orders = await db.select().from(orders);  // 1 query

for (const order of orders) {
  // This runs N times (once per order)
  order.items = await db.select().from(orderItems)
    .where(eq(orderItems.orderId, order.id));
}
// Result: 101 queries for 100 orders!
```

### Solution 1: Drizzle Relational Queries (Recommended)

Use the `with` clause for automatic batch loading:

```typescript
// ✅ GOOD: Single query with JOINs + JSON aggregation
const ordersWithItems = await db.query.orders.findMany({
  where: eq(orders.storeId, storeId),
  with: {
    items: true,  // Automatically loaded in same query
    customer: true,
    coupon: true
  },
  orderBy: desc(orders.createdAt),
  limit: 50
});
```

**Generated SQL:**
```sql
SELECT orders.*,
  COALESCE(json_agg(order_items.*) FILTER (WHERE order_items.id IS NOT NULL), '[]') as items,
  customers.*,
  coupons.*
FROM orders
LEFT JOIN order_items ON orders.id = order_items.order_id
LEFT JOIN customers ON orders.customer_id = customers.id
LEFT JOIN coupons ON orders.coupon_id = coupons.id
WHERE orders.store_id = $1
GROUP BY orders.id
ORDER BY orders.created_at DESC
LIMIT 50;
```

### Solution 2: Batch Loading with inArray()

When you need more control, use `inArray()`:

```typescript
// ✅ GOOD: 2 queries total (1 for orders, 1 for items)

// Step 1: Get orders
const orderList = await db.select().from(orders)
  .where(eq(orders.storeId, storeId))
  .limit(50);

// Step 2: Get all items in ONE query
const orderIds = orderList.map(o => o.id);
const allItems = await db.select().from(orderItems)
  .where(inArray(orderItems.orderId, orderIds));

// Step 3: Map items to orders
const itemsByOrderId = new Map();
for (const item of allItems) {
  if (!itemsByOrderId.has(item.orderId)) {
    itemsByOrderId.set(item.orderId, []);
  }
  itemsByOrderId.get(item.orderId).push(item);
}

// Step 4: Attach to orders
const ordersWithItems = orderList.map(order => ({
  ...order,
  items: itemsByOrderId.get(order.id) || []
}));
```

### Solution 3: Service Layer Pattern

Create reusable service methods that prevent N+1:

```typescript
// services/order.service.ts
export const orderService = {
  
  // ✅ Automatically loads relations without N+1
  async findWithRelations(storeId: string, options?: FindOptions) {
    return db.query.orders.findMany({
      where: eq(orders.storeId, storeId),
      with: {
        items: {
          with: {
            product: true  // Nested relation
          }
        },
        customer: true,
        coupon: true
      },
      ...options
    });
  },
  
  // ✅ Batch load by IDs
  async findByIdsWithItems(orderIds: string[]) {
    if (orderIds.length === 0) return [];
    
    return db.query.orders.findMany({
      where: inArray(orders.id, orderIds),
      with: {
        items: {
          with: {
            product: {
              columns: {
                id: true,
                titleEn: true,
                images: true
              }
            }
          }
        }
      }
    });
  },
  
  // ✅ For dashboard: Only load counts, not full data
  async findWithCounts(storeId: string) {
    const result = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      total: orders.total,
      status: orders.status,
      itemCount: sql<number>`COUNT(${orderItems.id})`,
      createdAt: orders.createdAt
    })
    .from(orders)
    .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
    .where(eq(orders.storeId, storeId))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt));
    
    return result;
  }
};
```

### Solution 4: E-commerce Specific Patterns

**Product with Categories (Many-to-One):**
```typescript
// ✅ Use relational queries
const productsWithCategories = await db.query.products.findMany({
  where: eq(products.storeId, storeId),
  with: {
    category: true,        // Many-to-one (singular)
    subcategory: true,     // Many-to-one (singular)
    variants: {            // One-to-many (collection)
      with: {
        options: true
      },
      limit: 10  // Always limit collections!
    }
  }
});
```

**Customer with Orders (One-to-Many):**
```typescript
// ✅ For customer list: Don't load all orders
const customers = await db.query.customers.findMany({
  where: eq(customers.storeId, storeId),
  with: {
    orders: {
      limit: 5,           // Limit to recent orders
      orderBy: desc(orders.createdAt),
      columns: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        createdAt: true
      }
    }
  }
});

// ✅ For single customer: Load all orders
const customerWithAllOrders = await db.query.customers.findFirst({
  where: eq(customers.id, customerId),
  with: {
    orders: {
      orderBy: desc(orders.createdAt)
      // No limit - load all for detail view
    },
    addresses: true
  }
});
```

### Solution 5: DataLoader Pattern (Advanced)

For complex GraphQL-like scenarios, implement DataLoader:

```typescript
// utils/dataLoader.ts
import DataLoader from 'dataloader';

export function createProductLoader() {
  return new DataLoader(async (productIds: string[]) => {
    // Single query for all requested products
    const products = await db.query.products.findMany({
      where: inArray(products.id, productIds),
      with: {
        category: true
      }
    });
    
    // Return in same order as input keys
    const productMap = new Map(products.map(p => [p.id, p]));
    return productIds.map(id => productMap.get(id) || null);
  });
}

// Usage in routes
fastify.get('/orders/:id', async (request, reply) => {
  const productLoader = createProductLoader();
  
  const order = await orderService.findById(request.params.id);
  
  // These will be batched automatically
  const itemsWithProducts = await Promise.all(
    order.items.map(async item => ({
      ...item,
      product: await productLoader.load(item.productId)
    }))
  );
  
  return { ...order, items: itemsWithProducts };
});
```

### Solution 6: Prepared Statements

For frequently run queries, use prepared statements:

```typescript
// ✅ Prepare once, execute multiple times
const preparedGetProducts = db.query.products.findMany({
  where: (products, { eq, and }) => and(
    eq(products.storeId, sql.placeholder('storeId')),
    eq(products.isPublished, true)
  ),
  with: {
    category: true
  },
  orderBy: desc(products.sortOrder)
}).prepare('get_products');

// Execute multiple times efficiently
const products1 = await preparedGetProducts.execute({ storeId: 'store-1' });
const products2 = await preparedGetProducts.execute({ storeId: 'store-2' });
```

### Common Pitfalls to Avoid

```typescript
// ❌ BAD: N+1 in map
const products = await db.select().from(products);
const withCategories = await Promise.all(
  products.map(async p => ({
    ...p,
    category: await db.query.categories.findFirst({
      where: eq(categories.id, p.categoryId)  // N queries!
    })
  }))
);

// ❌ BAD: Loop with await
for (const orderId of orderIds) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId)  // N queries!
  });
}

// ❌ BAD: Loading full collections without limits
await db.query.customers.findMany({
  with: {
    orders: true  // Could load thousands!
  }
});

// ✅ GOOD: Always limit collections
await db.query.customers.findMany({
  with: {
    orders: {
      limit: 10,
      orderBy: desc(orders.createdAt)
    }
  }
});
```

### Query Count Cheat Sheet

| Scenario | Bad (N+1) | Good | Queries |
|----------|-----------|------|---------|
| 100 orders with items | Loop with await | `with: { items: true }` | 1 |
| 100 products with categories | Loop query | `with: { category: true }` | 1 |
| Update 100 products | Individual updates | `db.update().where(inArray())` | 1 |
| Delete 100 items | Individual deletes | `db.delete().where(inArray())` | 1 |
| Dashboard counts | Load all + count in JS | SQL `COUNT()` with `GROUP BY` | 1 |

### Performance Monitoring

Add query counting to catch N+1 issues:

```typescript
// db/index.ts
import pino from 'pino';

const dbLogger = pino({ level: 'warn' });
let queryCount = 0;

export const db = drizzle(client, {
  schema,
  logger: {
    logQuery: (query, params) => {
      queryCount++;
      if (queryCount > 10) {
        // Use pino logger, NOT console.warn (violates no-console rule)
        dbLogger.warn(`Query count: ${queryCount} - Possible N+1 issue`);
      }
    }
  }
});

// Reset counter per request (call from onRequest hook)
export function resetQueryCount() {
  queryCount = 0;
}
```

---

**Key Takeaways:**
1. **Always use relational queries** (`with` clause) for parent-child relationships
2. **Use `inArray()`** for batch loading when you need custom logic
3. **Always limit collections** (`limit: 10`) to prevent loading too much data
4. **Use prepared statements** for frequently-run queries
5. **Monitor query counts** per request to catch N+1 issues early

**Sources:**
- Drizzle ORM Relational Queries (orm.drizzle.team)
- N+1 Query Problem - Webcoderspeed
- PostgreSQL Performance - SupaExplorer

---

## TypeScript Request Type Augmentation

The scope hooks attach `storeId`, `userId`, `userRole` etc. to the request object. Without proper type declarations, TypeScript will error on every access. This file is **mandatory**.

```typescript
// types/fastify.d.ts
import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    // Set by merchant scope hook (from JWT)
    storeId: string;
    userId: string;
    userRole: string;

    // Set by customer scope hook (from JWT)
    customerId?: string;

    // Set by superAdmin scope hook (from JWT)
    superAdminId?: string;
    adminRole?: string;
  }
}
```

Ensure `tsconfig.json` includes this file:
```json
{
  "include": ["src/**/*"]
}
```

Since `types/fastify.d.ts` is under `src/`, it will be auto-included.

**Key Rule:** NEVER use `(request as any).storeId`. Always rely on the type declaration above.

---

## Environment Variable Validation

Validate ALL environment variables at startup using Zod. Fail fast if any required variable is missing.

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // NOTE: Use z.object() here, NOT z.strictObject()
  // process.env contains many system vars (PATH, HOME, etc.)
  // strictObject() would reject them and crash at startup
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),

  // Email (optional in dev)
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),

  // Storage (optional in dev)
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

// Parse and export — throws on invalid config
export const env = envSchema.parse(process.env);

// Type-safe access: env.DATABASE_URL (not process.env.DATABASE_URL)
export type Env = z.infer<typeof envSchema>;
```

Usage in `index.ts`:
```typescript
import { env } from './config/env';  // Fails fast if invalid

const fastify = Fastify({
  logger: { level: env.LOG_LEVEL },
  trustProxy: true
});

await fastify.listen({ port: Number(env.PORT), host: env.HOST });
```

**Key Rule:** NEVER use `process.env.X` directly in route/service files. Always import from `config/env.ts`.

---

## Standardized Error Codes

Use typed error codes for API consistency. Clients can match on `code` instead of parsing `message` strings.

```typescript
// errors/codes.ts
export const ErrorCodes = {
  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Store
  STORE_SUSPENDED: 'STORE_SUSPENDED',
  STORE_NOT_FOUND: 'STORE_NOT_FOUND',
  PLAN_EXPIRED: 'PLAN_EXPIRED',

  // Product
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  INSUFFICIENT_INVENTORY: 'INSUFFICIENT_INVENTORY',
  PRODUCT_UNPUBLISHED: 'PRODUCT_UNPUBLISHED',

  // Order
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_ALREADY_FULFILLED: 'ORDER_ALREADY_FULFILLED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',

  // Coupon
  INVALID_COUPON: 'INVALID_COUPON',
  COUPON_EXPIRED: 'COUPON_EXPIRED',
  COUPON_USAGE_EXCEEDED: 'COUPON_USAGE_EXCEEDED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
```

Usage in routes:
```typescript
import { ErrorCodes } from '../../errors/codes';

// ✅ CORRECT - Include error code
reply.status(403).send({
  error: 'Forbidden',
  code: ErrorCodes.STORE_SUSPENDED,
  message: 'Store is suspended'
});

// ✅ CORRECT - Validation error with details
reply.status(400).send({
  error: 'Bad Request',
  code: ErrorCodes.VALIDATION_ERROR,
  message: 'Invalid input',
  details: error.issues  // Zod error details
});
```

---

## Health Check Endpoints

Essential for load balancers, container orchestration (K8s), and monitoring.

```typescript
// Register BEFORE scopes in index.ts (no auth required)

// Liveness - "is the process alive?"
fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));

// Readiness - "can it serve traffic?" (checks DB + Redis)
fastify.get('/health/ready', async (request, reply) => {
  try {
    // Check database
    await db.execute(sql`SELECT 1`);

    // Check Redis
    await redis.ping();

    return { status: 'ready' };
  } catch (err) {
    fastify.log.error(err, 'Health check failed');
    reply.status(503).send({ status: 'not ready', error: 'Service unavailable' });
  }
});
```

**Key Rules:**
- `/health` must NEVER require authentication
- `/health/ready` should check all critical dependencies
- Do NOT expose version numbers or internal details in production

---

## Graceful Shutdown

Prevents dropped connections and data corruption on restarts/deployments.

```typescript
// index.ts - Add after server start
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

for (const signal of signals) {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, shutting down gracefully...`);

    try {
      // 1. Stop accepting new requests, finish in-flight ones
      await fastify.close();

      // 2. Close Redis connections
      await redis.quit();

      // 3. Close database pool
      await db.$client.end();

      fastify.log.info('Server shut down successfully');
      process.exit(0);
    } catch (err) {
      fastify.log.error(err, 'Error during shutdown');
      process.exit(1);
    }
  });
}
```

**Key Rules:**
- Always close in order: HTTP server → Redis → Database
- Set a timeout (e.g., 30s) as a safety net if shutdown hangs
- Never call `process.exit()` without closing connections first

---

## CORS Configuration for Multi-Tenant

Multi-tenant SaaS needs dynamic CORS — each store has its own domain.

```typescript
// plugins/cors.ts
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';

export default fp(async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: async (origin) => {
      // Allow non-browser requests (Postman, server-to-server)
      if (!origin) return true;

      // Allow localhost in development
      if (env.NODE_ENV === 'development') {
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return true;
        }
      }

      // Check if origin matches a registered store domain
      try {
        const hostname = new URL(origin).hostname;
        const store = await fastify.storeService.findByDomain(hostname);
        return !!store;
      } catch {
        return false;
      }
    },
    credentials: true,  // Required for httpOnly cookies to work cross-origin
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,  // Cache preflight for 24 hours
  });
});
```

**Key Rules:**
- `credentials: true` is MANDATORY for httpOnly cookie authentication
- NEVER use `origin: '*'` with `credentials: true` — browsers will reject it
- Cache preflight responses with `maxAge` to reduce OPTIONS requests

---

## Pagination Pattern

Every listing endpoint MUST support pagination. Use cursor-based for large datasets, offset for admin panels.

### Cursor-Based Pagination (Recommended for public APIs)

```typescript
// Shared pagination schema
const cursorPaginationSchema = z.strictObject({
  cursor: z.string().uuid().optional(),  // ID of last item
  limit: z.number().int().min(1).max(100).default(20),
});

// In service
async findByStoreId(storeId: string, pagination: CursorPagination) {
  const { cursor, limit } = pagination;

  const items = await db.query.products.findMany({
    where: and(
      eq(products.storeId, storeId),
      eq(products.isPublished, true),
      cursor ? gt(products.id, cursor) : undefined
    ),
    orderBy: asc(products.id),
    limit: limit + 1,  // Fetch one extra to check hasMore
    with: { category: true }
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, -1) : items;

  return {
    data,
    pagination: {
      hasMore,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      count: data.length
    }
  };
}

// In route
fastify.get('/', async (request, reply) => {
  const { cursor, limit } = cursorPaginationSchema.parse(request.query);
  const result = await productService.findByStoreId(request.storeId, { cursor, limit });
  return result;
});
```

### Offset Pagination (For admin dashboards)

```typescript
const offsetPaginationSchema = z.strictObject({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'sortOrder', 'salePrice']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// In service
async findWithPagination(storeId: string, options: OffsetPagination) {
  const { page, limit, sortBy, sortOrder } = options;
  const offset = (page - 1) * limit;

  const [items, total] = await Promise.all([
    db.query.products.findMany({
      where: eq(products.storeId, storeId),
      limit,
      offset,
      orderBy: sortOrder === 'desc' ? desc(products[sortBy]) : asc(products[sortBy]),
      with: { category: true }
    }),
    db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.storeId, storeId))
  ]);

  return {
    data: items,
    pagination: {
      page,
      limit,
      total: total[0].count,
      totalPages: Math.ceil(total[0].count / limit),
      hasMore: page * limit < total[0].count
    }
  };
}
```

**Key Rules:**
- ALWAYS set a `max` on limit (e.g., 100) to prevent abuse
- Use cursor-based for public storefronts (better performance at scale)
- Use offset for admin panels (users need page numbers)

---

## Soft Delete vs Hard Delete

This project uses **hard delete** for most entities. The database schema does NOT include `isDeleted`/`deletedAt` columns.

### When to Use Each

| Entity | Strategy | Reason |
|--------|----------|--------|
| Products | Hard delete | Merchants should be able to fully remove products |
| Categories | Hard delete | Clean up unused categories |
| Orders | **NEVER delete** | Legal/accounting requirement — archive instead |
| Customers | Soft delete recommended | GDPR "right to erasure" = anonymize, don't delete |
| Reviews | Hard delete | Merchant can remove inappropriate reviews |
| Coupons | Hard delete | Expired coupons can be cleaned up |

### If You Need Soft Delete

Add these columns to the relevant table:

```typescript
// In schema
isDeleted: boolean("is_deleted").default(false),
deletedAt: timestamp("deleted_at"),
```

Then filter in ALL queries:

```typescript
// ✅ Service must always filter
async findByStoreId(storeId: string) {
  return db.query.products.findMany({
    where: and(
      eq(products.storeId, storeId),
      eq(products.isDeleted, false)  // Always exclude deleted
    )
  });
}

// ✅ Soft delete
async softDelete(id: string, storeId: string) {
  await db.update(products).set({
    isDeleted: true,
    deletedAt: new Date()
  }).where(and(
    eq(products.id, id),
    eq(products.storeId, storeId)
  ));
}
```

**Key Rule:** If you use soft delete, you MUST filter `isDeleted: false` in EVERY query. Missing even one creates data leaks.

---

## Zod ↔ Fastify Schema Integration

This project uses **Zod for validation in route handlers** (not Fastify's built-in JSON Schema). Here's why and how:

### Approach: Zod in Handler (Chosen Pattern)

```typescript
// routes/merchant/products.ts
import { z } from 'zod';

const createProductSchema = z.strictObject({
  titleEn: z.string().min(1).max(255),
  salePrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  categoryId: z.string().uuid(),
});

fastify.post('/', async (request, reply) => {
  // Validate with Zod
  const parsed = createProductSchema.parse(request.body);

  // Use validated data
  const product = await productService.create({
    ...parsed,
    storeId: request.storeId,
  });

  reply.status(201).send({ product });
});
```

### Why Zod Over Fastify JSON Schema?

| Feature | Zod | Fastify JSON Schema |
|---------|-----|-------------------|
| TypeScript inference | ✅ Automatic `z.infer<typeof schema>` | ❌ Manual types needed |
| Custom validators | ✅ `.refine()`, `.transform()` | ❌ Limited |
| Error messages | ✅ Detailed, customizable | ⚠️ Generic |
| Swagger docs | ❌ Needs `zod-to-json-schema` | ✅ Automatic |
| Performance | ⚠️ Slightly slower | ✅ Compiled (Ajv) |

### For Swagger Documentation

If you need Swagger auto-docs with Zod schemas:

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';

fastify.post('/', {
  schema: {
    body: zodToJsonSchema(createProductSchema),
    response: {
      201: zodToJsonSchema(productResponseSchema)
    }
  }
}, async (request, reply) => {
  const parsed = createProductSchema.parse(request.body);
  // ...
});
```

### Error Handling for Zod Validation

```typescript
import { ZodError } from 'zod';
import { ErrorCodes } from '../errors/codes';

// In setErrorHandler (index.ts or plugins)
fastify.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    reply.status(400).send({
      error: 'Bad Request',
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Validation failed',
      details: error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
    return;
  }

  // ... other error handling
});
```

---

## Testing Patterns

Use `node:test` (Node.js built-in) or `vitest` for testing. Use Fastify's `inject()` method for API testing without starting a real server.

### API Test Example

```typescript
// test/merchant/products.test.ts
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { buildApp } from '../../src/app';

describe('Merchant Products API', () => {
  let app: FastifyInstance;
  let authCookie: string;

  beforeEach(async () => {
    app = await buildApp();

    // Login to get auth cookie
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/merchant/auth/login',
      payload: { email: 'test@example.com', password: 'TestPass123' }
    });
    authCookie = loginResponse.headers['set-cookie'] as string;
  });

  afterEach(async () => {
    await app.close();
  });

  test('GET /products - returns products list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/merchant/products',
      headers: { cookie: authCookie }
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.ok(Array.isArray(body.products));
  });

  test('GET /products - requires auth', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/merchant/products'
      // No cookie = no auth
    });

    assert.strictEqual(response.statusCode, 401);
  });

  test('POST /products - validates body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/merchant/products',
      headers: { cookie: authCookie },
      payload: { titleEn: '' }  // Invalid - empty title
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.code, 'VALIDATION_ERROR');
  });

  test('POST /products - rejects unknown fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/merchant/products',
      headers: { cookie: authCookie },
      payload: {
        titleEn: 'Test Product',
        salePrice: '10.00',
        categoryId: 'valid-uuid-here',
        maliciousField: 'hacked'  // Should be rejected by strictObject
      }
    });

    assert.strictEqual(response.statusCode, 400);
  });
});
```

### Test Organization

```
apps/backend/
├── test/
│   ├── helpers/
│   │   ├── setup.ts        ← Test DB setup, seed data
│   │   └── auth.ts         ← Login helpers, token generators
│   ├── merchant/
│   │   ├── products.test.ts
│   │   ├── orders.test.ts
│   │   └── categories.test.ts
│   ├── public/
│   │   └── store.test.ts
│   ├── customer/
│   │   └── checkout.test.ts
│   └── superAdmin/
│       └── merchants.test.ts
```

### Key Testing Rules

1. **Use `fastify.inject()`** — Never start a real server in tests
2. **Test auth boundaries** — Every test suite should verify 401/403 behavior
3. **Test Zod validation** — Verify unknown fields are rejected
4. **Isolate with transactions** — Wrap each test in a DB transaction and rollback
5. **Never mock the database** — Use a test database with the same schema

---

## ⚠️ CRITICAL: Use pnpm ONLY (Never npm)

This project uses **pnpm** exclusively. npm is strictly prohibited.

### Why pnpm?
- **Disk efficient**: Shared dependencies across projects
- **Strict**: Prevents phantom dependencies
- **Fast**: Better parallelization
- **Monorepo optimized**: Native workspace support

### Installation Commands (pnpm ONLY)

```bash
# ❌ NEVER use npm
npm install                    # ❌ FORBIDDEN
npm i package-name             # ❌ FORBIDDEN
npm run dev                    # ❌ FORBIDDEN

# ✅ ALWAYS use pnpm
pnpm install                   # ✅ Install dependencies
pnpm add package-name          # ✅ Add dependency
pnpm add -D package-name       # ✅ Add dev dependency
pnpm run dev                   # ✅ Run scripts
pnpm exec command              # ✅ Execute commands
pnpm dlx package               # ✅ Download and execute

# Monorepo commands
pnpm --filter backend dev      # ✅ Run in specific workspace
pnpm -r run build              # ✅ Run in all workspaces
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### package.json with pnpm

```json
{
  "name": "saas-ecommerce",
  "version": "1.0.0",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "build": "pnpm -r run build",
    "dev": "pnpm --filter backend dev",
    "db:generate": "pnpm --filter backend db:generate",
    "db:migrate": "pnpm --filter backend db:migrate",
    "db:studio": "pnpm --filter backend db:studio",
    "lint": "pnpm -r run lint",
    "typecheck": "pnpm -r run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.4.0"
  }
}
```

### .npmrc (Force pnpm)

Create `.npmrc` in project root:
```
engine-strict=true
use-pnpm=true
```

---

## 🔒 Complete Security Checklist (Production-Ready)

### Pre-Deployment Security Audit

- [ ] **1. No console.log anywhere**
  ```typescript
  // ❌ WRONG
  console.log('Debug:', data);
  
  // ✅ CORRECT
  fastify.log.debug({ data }, 'Debug information');
  ```

- [ ] **2. No `any` type (TypeScript strict mode)**
  ```typescript
  // ❌ WRONG
  async function process(data: any): Promise<any> { }
  
  // ✅ CORRECT
  interface ProcessInput { /* ... */ }
  async function process(data: ProcessInput): Promise<Result> { }
  ```

- [ ] **3. No inline preHandler in route files**
  ```typescript
  // ❌ WRONG - Inline preHandler
  fastify.get('/', { preHandler: [auth] }, handler);
  
  // ✅ CORRECT - Hooks in scope only
  // scopes/merchant.ts
  fastify.addHook('onRequest', auth);
  ```

- [ ] **4. Zod strictObject() on ALL routes (Zod 4)**
  ```typescript
  const schema = z.strictObject({
    name: z.string()
  });  // ✅ Zod 4 - prevents additional properties
  ```

- [ ] **5. ownerEmail/ownerName/ownerPhone NEVER in public responses**
  ```typescript
  const { ownerEmail, ownerName, ownerPhone, ...publicStore } = store;
  return publicStore;  // ✅ Filtered
  ```

- [ ] **6. JWT ONLY in httpOnly cookie, NEVER in response body**
  ```typescript
  reply.setCookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });
  return { success: true };  // ✅ No token in body
  ```

- [ ] **7. storeId ONLY from JWT (request.storeId), NEVER from body/query**
  ```typescript
  // ❌ WRONG
  const storeId = request.body.storeId;
  
  // ✅ CORRECT
  const storeId = request.storeId; // Set by scope hook from JWT
  ```

- [ ] **8. No require() - ESM imports only**
  ```typescript
  // ❌ WRONG
  const bcrypt = require('bcrypt');
  
  // ✅ CORRECT
  import bcrypt from 'bcrypt';
  ```

- [ ] **9. fastify.log.* for all logging**
  ```typescript
  fastify.log.info('Server started');
  fastify.log.error({ err }, 'Database error');
  ```

- [ ] **10. Redis for caching and queues (never in-memory)**
  ```typescript
  // ✅ Redis only
  const cached = await redis.get(key);
  await emailQueue.add('send', data);
  ```

- [ ] **11. Seed files check NODE_ENV !== 'production'**
  ```typescript
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seeding not allowed in production');
  }
  ```

- [ ] **12. All SQL parameterized (Drizzle ORM only)**
  ```typescript
  // ❌ WRONG - Raw SQL
  db.execute(`SELECT * FROM users WHERE id = ${id}`);
  
  // ✅ CORRECT
  db.select().from(users).where(eq(users.id, id));
  ```

- [ ] **13. Rate limiting enabled on all scopes**
  ```typescript
  // scopes/merchant.ts
  await fastify.register(import('@fastify/rate-limit'), {
    max: 100,
    timeWindow: '1 minute'
  });
  ```

- [ ] **14. Helmet security headers**
  ```typescript
  await fastify.register(import('@fastify/helmet'));
  ```

- [ ] **15. CORS properly configured**
  ```typescript
  await fastify.register(import('@fastify/cors'), {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
    credentials: true
  });
  ```

- [ ] **16. Input sanitization on file uploads**
  ```typescript
  const fileType = await fileTypeFromBuffer(buffer);
  if (!allowedTypes.includes(fileType?.mime)) {
    throw new Error('Invalid file type');
  }
  ```

- [ ] **17. bcrypt for passwords (never plaintext)**
  ```typescript
  const hashed = await bcrypt.hash(password, 12);
  const valid = await bcrypt.compare(password, hashed);
  ```

- [ ] **18. Store status check on EVERY merchant route**
  ```typescript
  if (store.status === 'suspended') {
    return reply.status(403).send({ error: 'Store suspended' });
  }
  ```

- [ ] **19. Error responses NEVER expose stack traces**
  ```typescript
  reply.status(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An error occurred' 
      : error.message
  });
  ```

- [ ] **20. No sensitive data in logs**
  ```typescript
  // ❌ WRONG
  fastify.log.info({ user });
  
  // ✅ CORRECT
  fastify.log.info({ userId: user.id, email: user.email });
  ```

### Security Headers Check

Run this to verify headers:
```bash
curl -I http://localhost:3000/api/v1/public/health
```

Expected headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=...`
- `Content-Security-Policy: ...`

### Dependency Security Scan

```bash
# Scan for vulnerabilities
pnpm audit

# Update dependencies
pnpm update --interactive

# Check for outdated
pnpm outdated
```

---

## 📁 Complete Project Structure

```
D:/project_saas_ecom/
├── .claude/
│   └── skills/
│       └── saas-ecommerce-fastify/    ← Skill files
├── apps/
│   ├── backend/                        ← Fastify API
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts          ← Drizzle schema
│   │   │   │   └── index.ts           ← DB connection
│   │   │   ├── plugins/
│   │   │   │   ├── cors.ts
│   │   │   │   ├── jwt.ts
│   │   │   │   ├── rateLimit.ts
│   │   │   │   ├── swagger.ts
│   │   │   │   ├── redis.ts
│   │   │   │   ├── compress.ts
│   │   │   │   └── index.ts           ← Plugin registration
│   │   │   ├── scopes/
│   │   │   │   ├── public.ts          ← Public scope
│   │   │   │   ├── merchant.ts        ← Merchant scope + hooks
│   │   │   │   ├── customer.ts        ← Customer scope + hooks
│   │   │   │   └── superAdmin.ts      ← SuperAdmin scope + hooks
│   │   │   ├── routes/
│   │   │   │   ├── public/
│   │   │   │   │   ├── store.ts
│   │   │   │   │   ├── products.ts
│   │   │   │   │   ├── reviews.ts
│   │   │   │   │   ├── cart.ts
│   │   │   │   │   └── analytics.ts
│   │   │   │   ├── merchant/
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── store.ts
│   │   │   │   │   ├── products.ts
│   │   │   │   │   ├── categories.ts
│   │   │   │   │   ├── modifiers.ts
│   │   │   │   │   ├── orders.ts
│   │   │   │   │   ├── customers.ts
│   │   │   │   │   ├── reviews.ts
│   │   │   │   │   ├── coupons.ts
│   │   │   │   │   ├── analytics.ts
│   │   │   │   │   └── upload.ts
│   │   │   │   ├── customer/
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── profile.ts
│   │   │   │   │   ├── orders.ts
│   │   │   │   │   ├── checkout.ts
│   │   │   │   │   ├── wishlist.ts
│   │   │   │   │   └── reviews.ts
│   │   │   │   └── superAdmin/
│   │   │   │       ├── auth.ts
│   │   │   │       ├── merchants.ts
│   │   │   │       ├── plans.ts
│   │   │   │       └── stores.ts
│   │   │   ├── services/
│   │   │   │   ├── cache.service.ts
│   │   │   │   ├── queue.service.ts
│   │   │   │   ├── email.service.ts
│   │   │   │   ├── upload.service.ts
│   │   │   │   ├── product.service.ts
│   │   │   │   ├── order.service.ts
│   │   │   │   ├── customer.service.ts
│   │   │   │   └── index.ts
│   │   │   ├── types/
│   │   │   │   └── fastify.d.ts       ← Request type augmentation
│   │   │   └── index.ts               ← Entry (max 60 lines)
│   │   ├── drizzle/
│   │   │   └── migrations/            ← Auto-generated
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   ├── .env                       ← Environment variables
│   │   ├── .env.example
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── admin/                         ← SvelteKit Admin (future)
│   └── storefront/                    ← Next.js Storefront (future)
│
├── packages/
│   ├── shared-types/                  ← Shared TypeScript types
│   └── shared-utils/                  ← Shared utilities
│
├── .github/
│   └── workflows/
│       └── ci.yml                     ← CI/CD pipeline
│
├── .npmrc                             ← Force pnpm
├── pnpm-workspace.yaml                ← Workspace config
├── package.json                       ← Root package.json
├── turbo.json                         ← Turborepo config
└── README.md
```

### Root package.json

```json
{
  "name": "saas-ecommerce",
  "private": true,
  "version": "1.0.0",
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "db:generate": "pnpm --filter backend db:generate",
    "db:migrate": "pnpm --filter backend db:migrate",
    "db:studio": "pnpm --filter backend db:studio",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.4.0"
  }
}
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^test"]
    }
  }
}
```

---

## ✅ Final Verification Checklist

Before marking project complete, verify:

### Package Management
- [ ] Only pnpm used (no npm commands anywhere)
- [ ] pnpm-workspace.yaml configured
- [ ] turbo.json configured
- [ ] packageManager field set in package.json

### Security (20-point checklist above)
- [ ] All 20 security items verified
- [ ] Security headers present
- [ ] pnpm audit passes

### Architecture
- [ ] 4 scopes implemented (public, merchant, customer, superAdmin)
- [ ] No inline preHandler (hooks in scopes only)
- [ ] Routes + Services pattern used
- [ ] Encapsulation working correctly

### Database
- [ ] Drizzle ORM used (no raw SQL)
- [ ] Relations defined
- [ ] Migrations generated
- [ ] RLS enabled (optional but recommended)

### Performance
- [ ] N+1 queries eliminated (use `with` clause)
- [ ] Redis for caching
- [ ] BullMQ for queues
- [ ] Rate limiting enabled

### TypeScript
- [ ] Strict mode enabled
- [ ] No `any` types
- [ ] All imports typed

**Project is production-ready when ALL items are checked!**
