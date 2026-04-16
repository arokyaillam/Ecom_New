// TypeScript Request Type Augmentation
// The scope hooks attach storeId, userId, userRole etc. to the request object.
// Without this file, TypeScript will error on every access. This file is MANDATORY.

import 'fastify';
import type { CacheService } from '../services/cache.service.js';
import type { QueueService } from '../services/queue.service.js';
import type { EmailService } from '../services/email.service.js';
import type { UploadService } from '../services/upload.service.js';
import type { storeService } from '../services/store.service.js';

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

  interface FastifyInstance {
    cacheService: CacheService;
    queueService: QueueService;
    emailService: EmailService;
    uploadService: UploadService;
    storeService: typeof storeService;
  }
}

// Extend JWT verify payload types
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      // Merchant JWT payload
      userId?: string;
      storeId?: string;
      role?: string;
      // Customer JWT payload
      customerId?: string;
      // SuperAdmin JWT payload
      superAdminId?: string;
    };
  }
}