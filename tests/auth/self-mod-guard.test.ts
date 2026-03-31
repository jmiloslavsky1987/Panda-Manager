// tests/auth/self-mod-guard.test.ts
// AUTH-02: admin cannot modify their own account
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const ADMIN_ID = 'admin-self-1';

const mockSession = {
  user: { id: ADMIN_ID, email: 'admin@test.com', role: 'admin', active: true },
};

vi.mock('@/db', () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }),
    }),
  },
}));
vi.mock('@/db/schema', () => ({
  users: { id: 'id', email: 'email', name: 'name', role: 'role', active: 'active', createdAt: 'createdAt' },
  accounts: { userId: 'userId', password: 'password', providerId: 'providerId' },
}));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(mockSession),
      signUpEmail: vi.fn().mockResolvedValue({ user: { id: 'new-1' } }),
    },
  },
}));
vi.mock('@/lib/auth-server', () => ({
  requireSession: vi.fn().mockResolvedValue({
    session: mockSession,
    redirectResponse: null,
  }),
}));
vi.mock('@/lib/auth-utils', () => ({
  resolveRole: vi.fn().mockReturnValue('admin'),
}));

describe('Self-modification guard — AUTH-02', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PUT /api/settings/users where id === session.user.id returns 403', async () => {
    const { PUT } = await import('@/app/api/settings/users/route');
    const req = new NextRequest('http://localhost/api/settings/users', {
      method: 'PUT',
      body: JSON.stringify({ id: ADMIN_ID, email: 'newemail@test.com', role: 'user' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('You cannot modify your own account');
  });

  it('PATCH /api/settings/users (deactivate) where id === session.user.id returns 403', async () => {
    const { PATCH } = await import('@/app/api/settings/users/route');
    const req = new NextRequest('http://localhost/api/settings/users', {
      method: 'PATCH',
      body: JSON.stringify({ id: ADMIN_ID }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('You cannot modify your own account');
  });
});
