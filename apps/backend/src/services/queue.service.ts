// Queue Service - BullMQ for async job processing
import { Queue, Worker, type Job } from 'bullmq';

const parseRedisUrl = (url: string): Record<string, unknown> => {
  const parsed = new URL(url);
  const result: Record<string, unknown> = {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379'),
  };
  if (parsed.password) result.password = parsed.password;
  if (parsed.username && parsed.username !== 'default') result.username = parsed.username;
  const db = parsed.pathname.slice(1);
  if (db) result.db = parseInt(db);
  return result;
};

export const createQueueService = (redisUrl: string) => {
  const connection = parseRedisUrl(redisUrl);

  // Email queue
  const emailQueue = new Queue('emails', { connection });

  // Image processing queue
  const imageQueue = new Queue('images', { connection });

  // Analytics queue
  const analyticsQueue = new Queue('analytics', { connection });

  // Track workers for graceful shutdown
  const workers: Worker[] = [];

  const createWorker = <T>(
    queueName: string,
    processor: (job: Job<T>) => Promise<void>,
  ) => {
    const worker = new Worker<T>(queueName, processor, {
      connection,
      concurrency: 5,
    });
    workers.push(worker);
    return worker;
  };

  return {
    emailQueue,
    imageQueue,
    analyticsQueue,
    createWorker,
    async closeAll(): Promise<void> {
      await Promise.all(workers.map((w) => w.close()));
      await emailQueue.close();
      await imageQueue.close();
      await analyticsQueue.close();
    },
  };
};

export type QueueService = ReturnType<typeof createQueueService>;