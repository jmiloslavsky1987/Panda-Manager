/**
 * scripts/run-migrations.ts
 * Raw SQL migration runner for Docker fresh installs.
 * Reads all db/migrations/*.sql files in order and executes each statement
 * individually — bypasses drizzle-kit's migrator which requires
 * statement-breakpoint markers. Tracks applied migrations in a
 * _migrations table so re-runs are safe (idempotent).
 */
import postgres, { type Sql } from 'postgres';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

// Split SQL into statements, handling both semicolons and drizzle-kit
// -->statement-breakpoint markers, and respecting dollar-quoted blocks ($$...$$).
function splitStatements(content: string): string[] {
  // Normalise drizzle-kit breakpoints to a plain semicolon so the rest of the
  // parser sees a consistent delimiter.
  const normalised = content.replace(/-->[ \t]*statement-breakpoint/g, ';');

  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;

  const lines = normalised.split('\n');
  for (const line of lines) {
    const matches = (line.match(/\$\$/g) || []).length;
    if (matches % 2 !== 0) inDollarQuote = !inDollarQuote;

    current += line + '\n';

    if (!inDollarQuote && line.trimEnd().endsWith(';')) {
      const stmt = current.trim().replace(/;$/, '').trim();
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

// Execute a statement, ignoring benign "already exists" / "does not exist" notices.
async function execStatement(sql: Sql, stmt: string): Promise<void> {
  try {
    await sql.unsafe(stmt);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Postgres error codes for "already exists" or "does not exist" — safe to skip
    const ignorable = [
      'already exists',
      'does not exist',
      'duplicate column',
      'duplicate key value',
    ];
    if (ignorable.some(s => msg.includes(s))) {
      console.log(`  [skip] ${msg.split('\n')[0]}`);
      return;
    }
    throw err;
  }
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
      await execStatement(sql, stmt);
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
