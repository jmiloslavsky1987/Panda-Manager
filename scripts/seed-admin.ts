/**
 * scripts/seed-admin.ts
 * Creates the default admin account for local testing.
 * Run with: npx tsx scripts/seed-admin.ts
 * Idempotent — exits 0 if admin already exists.
 */
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import db from '../db';
import { users, accounts } from '../db/schema';
import { eq } from 'drizzle-orm';

const ADMIN_EMAIL = 'admin@localhost.dev';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME = 'Admin';

async function main() {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, ADMIN_EMAIL));
  if (existing) {
    console.log(`Admin already exists (id: ${existing.id}) — skipping.`);
    process.exit(0);
  }

  const userId = randomUUID();
  const accountId = randomUUID();
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await db.insert(users).values({
    id: userId,
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    emailVerified: true,
    role: 'admin',
    active: true,
  });

  await db.insert(accounts).values({
    id: accountId,
    accountId: userId,
    providerId: 'credential',
    userId,
    password: hash,
  });

  console.log('Admin user created.');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
