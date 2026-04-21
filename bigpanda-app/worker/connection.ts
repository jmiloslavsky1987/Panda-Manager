// bigpanda-app/worker/connection.ts
/**
 * Redis connection factory for BullMQ worker.
 * CRITICAL: maxRetriesPerRequest: null is REQUIRED — without it, BullMQ Worker
 * throws EXECABORT errors and silently stops processing jobs.
 * Each caller (Queue, Worker) must get its own connection instance.
 */
import { Redis } from 'ioredis';

/** For BullMQ Worker — must use maxRetriesPerRequest: null */
export function createRedisConnection(): Redis {
  const url = process.env.REDIS_URL!;
  if (!url) {
    throw new Error('REDIS_URL environment variable is required');
  }
  return new Redis(url, {
    maxRetriesPerRequest: null,  // REQUIRED for BullMQ Worker
    enableReadyCheck: false,
  });
}

/** For Queue clients in API routes — fail fast if Redis is unavailable */
export function createApiRedisConnection(): Redis {
  const url = process.env.REDIS_URL!;
  if (!url) {
    throw new Error('REDIS_URL environment variable is required');
  }
  return new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    connectTimeout: 3000,
    lazyConnect: true,
  });
}

// Shared connection for Queue clients (not for Worker — Worker needs its own)
export const redisConnection = createRedisConnection();
