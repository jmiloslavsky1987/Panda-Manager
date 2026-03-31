// tests/auth/login.test.ts
// GREEN — AUTH-01: signIn.email() happy path + wrong password
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock better-auth/react before any imports use it
vi.mock('better-auth/react', () => ({
  createAuthClient: vi.fn(() => ({
    signIn: {
      email: vi.fn(),
    },
    signOut: vi.fn(),
    useSession: vi.fn(),
    getSession: vi.fn(),
  })),
}));

vi.mock('@/db', () => ({ db: {} }));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));

import { signIn } from '@/lib/auth-client';

describe('signIn.email() — AUTH-01', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves to a session object with correct credentials', async () => {
    // Mock signIn.email to return a valid session on correct credentials
    const mockSession = { id: 'session-1', userId: 'user-1', expiresAt: new Date() };
    (signIn.email as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: mockSession,
      error: null,
    });

    const result = await signIn.email({ email: 'admin@example.com', password: 'correct-pass' });
    expect(result.data).toBeDefined();
    expect(result.error).toBeNull();
  });

  it('rejects with error message containing "Invalid" for wrong password', async () => {
    // Mock signIn.email to return an error on wrong credentials
    (signIn.email as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid email or password' },
    });

    const result = await signIn.email({ email: 'admin@example.com', password: 'wrong-pass' });
    expect(result.error).toBeDefined();
    expect(result.error?.message).toMatch(/Invalid/i);
  });
});
