import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { env } from '../../config/env.js';

const s3 = new S3Client({
  region: env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
  },
});

export const backupService = {
  async getLatestBackup() {
    const result = await s3.send(new ListObjectsV2Command({
      Bucket: env.S3_BACKUP_BUCKET ?? '',
      Prefix: 'backups/',
      MaxKeys: 1,
    }));
    const latest = result.Contents?.[0];
    if (!latest) return null;
    return {
      filename: latest.Key,
      size: latest.Size,
      lastModified: latest.LastModified,
    };
  },
};
