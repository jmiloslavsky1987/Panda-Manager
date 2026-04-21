/**
 * scripts/run-migrations.ts
 * Raw SQL migration runner for Docker fresh installs.
 * Reads all db/migrations/*.sql files in order and executes each statement
 * individually — bypasses drizzle-kit's migrator which requires
 * statement-breakpoint markers. Tracks applied migrations in a
 * _migrations table so re-runs are safe (idempotent).
 */
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

// Split SQL into statements, respecting dollar-quoted blocks ($$...$$).
function splitStatements(content: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;

  const lines = content.split('\n');
  for (const line of lines) {
    const matches = (line.match(/\$\$/g) || []).length;
    if (matches % 2 !== 0) inDollarQuote = !inDollarQuote;

    current += line + '\n';

    if (!inDollarQuote && line.trimEnd().endsWith(';')) {
      const stmt = current.trim();
      if (stmt.length > 0 && !stmt.startsWith('--')) {
        statements.push(stmt);
      }
      current = '';
    }
  }

  const remaining = current.trim();
  if (remaining.length > 0 && !remaining.startsWith('--')) {
    statements.push(remaining);
  }

  return statements;
}

async function main() {
  // Ensure migrations tracking table exists
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const migrationsDir = './db/migrations';
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const [existing] = await sql`SELECT 1 FROM _migrations WHERE name = ${file}`;
    if (existing) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }

    console.log(`Applying ${file}...`);
    const content = readFileSync(join(migrationsDir, file), 'utf-8');
    const statements = splitStatements(content);

    for (const stmt of statements) {
      await sql.unsafe(stmt);
    }

    await sql`INSERT INTO _migrations (name) VALUES (${file})`;
    console.log(`Applied ${file}`);
  }

  console.log('All migrations applied successfully.');
  await sql.end();
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration failed:', err.message);
    sql.end().catch(() => {});
    process.exit(1);
  });
