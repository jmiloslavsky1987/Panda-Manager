/**
 * scripts/run-migrations.ts
 * Raw SQL migration runner for Docker fresh installs.
 * Reads 0001_initial.sql and executes each statement individually —
 * bypasses drizzle-kit's migrator which requires statement-breakpoint markers.
 */
import postgres from 'postgres';
import { readFileSync } from 'fs';

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

// Split SQL into statements, respecting dollar-quoted blocks ($$...$$).
// A bare semicolon inside a $$-block is part of a function body and must not split.
function splitStatements(content: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;

  const lines = content.split('\n');
  for (const line of lines) {
    // Toggle dollar-quote state on each $$ occurrence in the line
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
  const content = readFileSync('./db/migrations/0001_initial.sql', 'utf-8');

  const statements = splitStatements(content);

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
