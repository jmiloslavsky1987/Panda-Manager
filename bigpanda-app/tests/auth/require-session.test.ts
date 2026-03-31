// tests/auth/require-session.test.ts
// RED stub — AUTH-05: requireSession() returns 401 with no session cookie
// These tests will turn GREEN when lib/auth-server.ts is implemented in Wave 1.
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({ db: {} }));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));

// Import the target (does NOT exist yet — will resolve when lib/auth-server.ts is implemented)
// import { requireSession } from '@/lib/auth-server';

describe('requireSession() — AUTH-05', () => {
  it('returns { session: null, redirectResponse: 401 NextResponse } when auth.api.getSession returns null', async () => {
    // RED: requireSession is not implemented yet
    // When GREEN:
    //   vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: vi.fn().mockResolvedValue(null) } } }))
    //   const { session, redirectResponse } = await requireSession(new Headers())
    //   expect(session).toBeNull()
    //   expect(redirectResponse?.status).toBe(401)
    const requireSession: any = undefined;
    expect(requireSession).toBeDefined();
  });

  it('returns { session, redirectResponse: null } when auth.api.getSession returns a valid session', async () => {
    // RED: requireSession is not implemented yet
    // When GREEN:
    //   vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: vi.fn().mockResolvedValue({ user: { id: '1' } }) } } }))
    //   const { session, redirectResponse } = await requireSession(new Headers())
    //   expect(session).not.toBeNull()
    //   expect(redirectResponse).toBeNull()
    const requireSession: any = undefined;
    expect(requireSession).toBeDefined();
  });
});
