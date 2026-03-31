/**
 * db/index.ts — Singleton PostgreSQL connection pool for BigPanda Project Assistant
 *
 * Uses globalThis.__pgConnection pattern to prevent multiple pool instances
 * during Next.js hot-reload in development. In production, module caching
 * ensures the singleton — globalThis is only used in dev.
 *
 * Note: 'server-only' import is intentionally omitted here to allow
 * the same module to be imported in tests (Node.js test runner context).
 * Next.js enforces server/client boundaries at build time via RSC analysis.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __pgConnection: ReturnType<typeof postgres> | undefined;
}

const connection = globalThis.__pgConnection ?? postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgConnection = connection;
}

export const db = drizzle(connection, { schema });

export default db;
