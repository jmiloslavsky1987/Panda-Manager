// tests/auth/require-session.test.ts
// GREEN — AUTH-05: requireSession() returns 401 with no session cookie
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server before importing requireSession
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
}));

// Mock next/headers (returns empty headers by default)
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock db to avoid real connection
vi.mock('@/db', () => ({ db: {} }));

// Mock the auth module using a factory that returns stable mock
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Import after mocks are set up
import { requireSession } from '@/lib/auth-server';
import { auth } from '@/lib/auth';

const mockGetSession = vi.mocked(auth.api.getSession);

beforeEach(() => {
  mockGetSession.mockReset();
});

describe('requireSession() — AUTH-05', () => {
  it('returns { session: null, redirectResponse: 401 } when auth.api.getSession returns null', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await requireSession();

    expect(result.session).toBeNull();
    expect(result.redirectResponse).not.toBeNull();
    expect(result.redirectResponse?.status).toBe(401);
  });

  it('returns { session, redirectResponse: null } when auth.api.getSession returns a valid session', async () => {
    const fakeSession = { user: { id: 'user-1', email: 'test@example.com', role: 'user' } };
    mockGetSession.mockResolvedValue(fakeSession as any);

    const result = await requireSession();

    expect(result.session).toEqual(fakeSession);
    expect(result.redirectResponse).toBeNull();
  });
});
