// Phase 86: unauthenticated health check endpoint for load balancers.
//
// Contract:
// - No session/auth guard: ALB target groups hit this without cookies.
// - Fresh DB + Redis connections per request (NOT module-level singletons) so a
//   cached-healthy pool cannot mask an actual outage. See 86-RESEARCH.md
//   "Anti-Patterns" for why @/db and getRedisConnection are unsafe here.
// - Returns 200 + { db: 'ok', redis: 'ok' } when both up.
// - Returns 503 + per-service breakdown ({ db: 'ok'|'error', redis: 'ok'|'error' })
//   when either dependency is down.

import { NextResponse } from 'next/server';
import postgres from 'postgres';
import { Redis } from 'ioredis';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const results: Record<string, 'ok' | 'error'> = {};

  // DB ping — fresh short-lived connection, 5s connect timeout, force-close on exit.
  // Note: we do NOT pre-validate process.env.DATABASE_URL; postgres() will throw
  // synchronously on a bad/empty URL, which is caught below as db: 'error'. This
  // keeps the contract simple (any failure → 'error') and matches the test mock
  // pattern that injects a mocked postgres() regardless of env state.
  try {
    const sql = postgres(process.env.DATABASE_URL ?? '', { max: 1, connect_timeout: 5 });
    try {
      await sql`SELECT 1`;
      results.db = 'ok';
    } finally {
      // timeout: 1 forces the connection to close fast even if a query is
      // mid-flight — without this, serverless invocations hang on shutdown.
      await sql.end({ timeout: 1 });
    }
  } catch {
    results.db = 'error';
  }

  // Redis ping — fresh connection, lazyConnect so the first command triggers
  // the actual TCP connect under our control, single retry, 3s connect timeout.
  // As with the DB ping above, we let ioredis throw on a bad/empty URL rather
  // than pre-validating env (caught below as redis: 'error').
  let redis: Redis | null = null;
  try {
    redis = new Redis(process.env.REDIS_URL ?? '', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    });
    // With lazyConnect: true, .ping() triggers the actual connection — no separate connect() needed.
    await redis.ping();
    results.redis = 'ok';
  } catch {
    results.redis = 'error';
  } finally {
    if (redis) {
      try {
        await redis.quit();
      } catch {
        redis.disconnect();
      }
    }
  }

  const allOk = Object.values(results).every((v) => v === 'ok');
  return NextResponse.json(results, { status: allOk ? 200 : 503 });
}
