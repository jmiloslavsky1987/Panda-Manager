/**
 * scripts/run-migrations.ts
 * Programmatic migration runner for Docker — applies all pending migrations
 * and exits cleanly (drizzle-kit migrate hangs in non-TTY containers).
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(sql);

migrate(db, { migrationsFolder: './db/migrations' })
  .then(() => {
    console.log('Migrations applied successfully.');
    return sql.end();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
