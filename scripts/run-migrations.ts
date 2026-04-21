/**
 * scripts/run-migrations.ts
 * Raw SQL migration runner for Docker fresh installs.
 * Reads 0001_initial.sql and executes each statement individually —
 * bypasses drizzle-kit's migrator which requires statement-breakpoint markers.
 */
import postgres from 'postgres';
import { readFileSync } from 'fs';

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  const content = readFileSync('./db/migrations/0001_initial.sql', 'utf-8');

  // Split on semicolons — pg_dump DDL statements don't contain embedded semicolons
  const statements = content
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Applying ${statements.length} statements...`);

  for (const stmt of statements) {
    await sql.unsafe(stmt);
  }

  console.log('Migrations applied successfully.');
  await sql.end();
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration failed:', err.message);
    sql.end().catch(() => {});
    process.exit(1);
  });
