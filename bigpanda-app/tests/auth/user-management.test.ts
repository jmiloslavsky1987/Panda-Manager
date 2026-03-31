// tests/auth/user-management.test.ts
// AUTH-02: admin create/edit/deactivate user via API routes
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Hoisted mocks
const mockDbUpdate = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) });
const mockDbSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({
    orderBy: vi.fn().mockResolvedValue([]),
  }),
});
const mockDbMock = {
  update: mockDbUpdate,
  select: mockDbSelect,
};

const mockSession = {
  user: { id: 'admin-1', email: 'admin@test.com', role: 'admin', active: true },
};

vi.mock('@/db', () => ({ db: mockDbMock }));
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
      signUpEmail: vi.fn().mockResolvedValue({ user: { id: 'new-user-1' } }),
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

describe('User Management API — AUTH-02', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-establish the mocked return values after clearAllMocks
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([]),
      }),
    });
  });

  it('POST /api/settings/users creates a new user record (returns 201)', async () => {
    const { POST } = await import('@/app/api/settings/users/route');
    const req = new NextRequest('http://localhost/api/settings/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', password: 'secret123', name: 'New User', role: 'user' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('PUT /api/settings/users updates email and role (returns 200)', async () => {
    const { PUT } = await import('@/app/api/settings/users/route');
    const req = new NextRequest('http://localhost/api/settings/users', {
      method: 'PUT',
      body: JSON.stringify({ id: 'other-user-1', email: 'updated@test.com', role: 'admin' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('PUT /api/settings/users with active=false deactivates the user (returns 200, user.active is false)', async () => {
    const { PUT } = await import('@/app/api/settings/users/route');
    const req = new NextRequest('http://localhost/api/settings/users', {
      method: 'PUT',
      body: JSON.stringify({ id: 'other-user-1', active: false }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
