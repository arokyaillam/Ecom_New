// Merchant Upload Routes - Image upload with validation
import { FastifyInstance } from 'fastify';
import { ErrorCodes } from '../../errors/codes.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default async function merchantUploadRoutes(fastify: FastifyInstance) {
  // POST /api/v1/merchant/upload
  fastify.post('/', async (request, reply) => {
    const data = await request.file();

    if (!data) {
      reply.status(400).send({
        error: 'Bad Request',
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'No file provided',
      });
      return;
    }

    // Validate mimetype
    if (!ALLOWED_TYPES.includes(data.mimetype)) {
      reply.status(400).send({
        error: 'Bad Request',
        code: ErrorCodes.INVALID_FILE_TYPE,
        message: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
      });
      return;
    }

    // Read file buffer
    const buffer = await data.toBuffer();

    // Validate size
    if (buffer.length > MAX_FILE_SIZE) {
      reply.status(400).send({
        error: 'Bad Request',
        code: ErrorCodes.FILE_TOO_LARGE,
        message: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
      return;
    }

    const result = await fastify.uploadService.uploadImage(buffer, request.storeId, 'products');

    reply.status(201).send({ file: result });
  });
}