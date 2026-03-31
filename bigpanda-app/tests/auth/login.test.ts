// tests/auth/login.test.ts
// RED stub — AUTH-01: signIn.email() happy path + wrong password
// These tests will turn GREEN when lib/auth.ts is implemented in Wave 1.
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({ db: {} }));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('better-auth', () => ({ betterAuth: vi.fn() }));

// Import the target (does NOT exist yet — will resolve when lib/auth.ts is implemented)
// import { auth } from '@/lib/auth';

describe('signIn.email() — AUTH-01', () => {
  it('resolves to a session object with correct credentials', async () => {
    // RED: auth.api.signInEmail is not implemented yet
    // When GREEN: signIn.email({ email, password }) should resolve to a session object (not undefined)
    const auth: any = undefined; // will be: import { auth } from '@/lib/auth'
    expect(auth).toBeDefined();
    expect(auth?.api?.signInEmail).toBeDefined();
  });

  it('rejects with error message containing "Invalid" for wrong password', async () => {
    // RED: auth.api.signInEmail is not implemented yet
    // When GREEN: signIn.email() with wrong password should reject with error containing "Invalid"
    const auth: any = undefined; // will be: import { auth } from '@/lib/auth'
    expect(auth).toBeDefined();
    // Simulate: expect(() => auth.api.signInEmail({ body: { email: 'user@test.com', password: 'wrong' } })).rejects.toThrow(/Invalid/i)
  });
});
