/**
 * scripts/seed-test-user.ts
 * Creates a second user account for testing multi-tenant isolation.
 * Run with: npx tsx scripts/seed-test-user.ts
 */
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import db from '../db';
import { users, accounts } from '../db/schema';
import { eq } from 'drizzle-orm';

const TEST_EMAIL = 'testuser@localhost.dev';
const TEST_PASSWORD = 'testpass123';
const TEST_NAME = 'Test User B';

async function main() {
  // Check if already exists
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, TEST_EMAIL));
  if (existing) {
    console.log(`Test user already exists (id: ${existing.id}) — email: ${TEST_EMAIL}, password: ${TEST_PASSWORD}`);
    process.exit(0);
  }

  const userId = randomUUID();
  const accountId = randomUUID();
  const hash = await bcrypt.hash(TEST_PASSWORD, 12);

  await db.insert(users).values({
    id: userId,
    name: TEST_NAME,
    email: TEST_EMAIL,
    emailVerified: true,
    role: 'user',
    active: true,
  });

  await db.insert(accounts).values({
    id: accountId,
    accountId: userId,
    providerId: 'credential',
    userId,
    password: hash,
  });

  console.log('✓ Test user created');
  console.log(`  Email:    ${TEST_EMAIL}`);
  console.log(`  Password: ${TEST_PASSWORD}`);
  console.log(`  User ID:  ${userId}`);
  console.log('');
  console.log('Log in as this user in a second browser / incognito window to test isolation.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
