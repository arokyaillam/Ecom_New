// Service index - exports all services
// Services are created in the app initialization and decorated on fastify

export { storeService } from './store.service.js';
export { authService } from './auth.service.js';
export { createCacheService } from './cache.service.js';
export { createQueueService } from './queue.service.js';
export { createEmailService } from './email.service.js';
export { createUploadService } from './upload.service.js';
export { productService } from './product.service.js';
export { categoryService } from './category.service.js';
export { modifierService } from './modifier.service.js';
export { orderService } from './order.service.js';
export { customerService } from './customer.service.js';
export { reviewService } from './review.service.js';
export { couponService } from './coupon.service.js';
export { analyticsService } from './analytics.service.js';
export { superAdminService } from './superAdmin.service.js';