// Upload Service - File validation and S3 upload (local first, S3 later)
import { fileTypeFromBuffer } from 'file-type';
import { ErrorCodes } from '../errors/codes.js';

interface UploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
}

const DEFAULT_OPTIONS: Required<UploadOptions> = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
};

interface UploadResult {
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

export const createUploadService = (_options?: {
  s3Bucket?: string;
  s3Region?: string;
}) => {
  return {
    async validateFile(
      buffer: Buffer,
      uploadOptions: UploadOptions = {},
    ): Promise<{ ext: string; mime: string }> {
      const config = { ...DEFAULT_OPTIONS, ...uploadOptions };

      if (buffer.length > config.maxSize) {
        throw Object.assign(
          new Error(`File too large. Max size: ${config.maxSize / 1024 / 1024}MB`),
          { code: ErrorCodes.FILE_TOO_LARGE },
        );
      }

      const fileType = await fileTypeFromBuffer(buffer);

      if (!fileType || !config.allowedTypes.includes(fileType.mime)) {
        throw Object.assign(
          new Error(`Invalid file type. Allowed: ${config.allowedTypes.join(', ')}`),
          { code: ErrorCodes.INVALID_FILE_TYPE },
        );
      }

      return fileType;
    },

    async uploadImage(
      buffer: Buffer,
      storeId: string,
      folder: string = 'products',
    ): Promise<UploadResult> {
      const fileType = await this.validateFile(buffer);

      const filename = `${folder}/${storeId}/${Date.now()}-${crypto.randomUUID()}.${fileType.ext}`;

      // Local storage for now - S3 will be added in Phase 11
      // For dev, return a placeholder URL
      const url = `/uploads/${filename}`;

      return {
        filename,
        mimeType: fileType.mime,
        size: buffer.length,
        url,
      };
    },

    async deleteImage(_url: string): Promise<void> {
      // S3 deletion will be implemented in Phase 11
    },
  };
};

export type UploadService = ReturnType<typeof createUploadService>;