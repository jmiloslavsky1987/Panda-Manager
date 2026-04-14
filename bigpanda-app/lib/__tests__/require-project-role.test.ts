import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that load the modules
// ---------------------------------------------------------------------------

// Mock DB so no real Postgres connection is required
vi.mock('@/db', () => {
  const dbMock = {
    select: vi.fn(),
  };
  return { db: dbMock, default: dbMock };
});

// Mock auth-server requireSession
vi.mock('@/lib/auth-server', async () => {
  const actual = await vi.importActual('@/lib/auth-server');
  return {
    ...actual,
    requireSession: vi.fn(),
  };
});

// Mock auth-utils resolveRole
vi.mock('@/lib/auth-utils', () => ({
  resolveRole: vi.fn(),
}));

import { db } from '@/db';
import { requireSession, requireProjectRole } from '@/lib/auth-server';
import { resolveRole } from '@/lib/auth-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_SESSION = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
  },
  session: {
    id: 'session-123',
    expiresAt: new Date(Date.now() + 1000000),
  },
};

const UNAUTHORIZED_RESPONSE = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

/**
 * Build a select mock that returns membership rows
 */
function mockMembershipQuery(membershipRows: Array<{ role: 'admin' | 'user' }>) {
  return vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(membershipRows),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('requireProjectRole()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated requests', async () => {
    // Mock requireSession returning no session
    vi.mocked(requireSession).mockResolvedValue({
      session: null,
      redirectResponse: UNAUTHORIZED_RESPONSE,
    });

    const result = await requireProjectRole(1, 'user');

    expect(result.session).toBeNull();
    expect(result.redirectResponse).toBeDefined();
    expect(result.redirectResponse?.status).toBe(401);
    expect(result.projectRole).toBeNull();
  });

  it('short-circuits for global admins without querying project_members', async () => {
    // Mock requireSession returning authenticated session
    vi.mocked(requireSession).mockResolvedValue({
      session: MOCK_SESSION,
      redirectResponse: null,
    });

    // Mock resolveRole returning 'admin' (global admin)
    vi.mocked(resolveRole).mockReturnValue('admin');

    const result = await requireProjectRole(1, 'user');

    expect(result.session).toEqual(MOCK_SESSION);
    expect(result.redirectResponse).toBeNull();
    expect(result.projectRole).toBe('admin');

    // Verify db.select was NOT called (short-circuit)
    expect(db.select).not.toHaveBeenCalled();
  });

  it('returns admin projectRole for members with admin role when minRole is user', async () => {
    // Mock requireSession returning authenticated session
    vi.mocked(requireSession).mockResolvedValue({
      session: MOCK_SESSION,
      redirectResponse: null,
    });

    // Mock resolveRole returning 'user' (not a global admin)
    vi.mocked(resolveRole).mockReturnValue('user');

    // Mock DB returning admin membership
    vi.mocked(db.select).mockImplementation(mockMembershipQuery([{ role: 'admin' }]));

    const result = await requireProjectRole(1, 'user');

    expect(result.session).toEqual(MOCK_SESSION);
    expect(result.redirectResponse).toBeNull();
    expect(result.projectRole).toBe('admin');
  });

  it('returns user projectRole for members with user role when minRole is user', async () => {
    // Mock requireSession returning authenticated session
    vi.mocked(requireSession).mockResolvedValue({
      session: MOCK_SESSION,
      redirectResponse: null,
    });

    // Mock resolveRole returning 'user' (not a global admin)
    vi.mocked(resolveRole).mockReturnValue('user');

    // Mock DB returning user membership
    vi.mocked(db.select).mockImplementation(mockMembershipQuery([{ role: 'user' }]));

    const result = await requireProjectRole(1, 'user');

    expect(result.session).toEqual(MOCK_SESSION);
    expect(result.redirectResponse).toBeNull();
    expect(result.projectRole).toBe('user');
  });

  it('returns 403 for user-role members when minRole is admin', async () => {
    // Mock requireSession returning authenticated session
    vi.mocked(requireSession).mockResolvedValue({
      session: MOCK_SESSION,
      redirectResponse: null,
    });

    // Mock resolveRole returning 'user' (not a global admin)
    vi.mocked(resolveRole).mockReturnValue('user');

    // Mock DB returning user membership
    vi.mocked(db.select).mockImplementation(mockMembershipQuery([{ role: 'user' }]));

    const result = await requireProjectRole(1, 'admin');

    expect(result.session).toBeNull();
    expect(result.redirectResponse).toBeDefined();
    expect(result.redirectResponse?.status).toBe(403);
    expect(result.projectRole).toBeNull();
  });

  it('returns 403 for non-members', async () => {
    // Mock requireSession returning authenticated session
    vi.mocked(requireSession).mockResolvedValue({
      session: MOCK_SESSION,
      redirectResponse: null,
    });

    // Mock resolveRole returning 'user' (not a global admin)
    vi.mocked(resolveRole).mockReturnValue('user');

    // Mock DB returning no membership
    vi.mocked(db.select).mockImplementation(mockMembershipQuery([]));

    const result = await requireProjectRole(1, 'user');

    expect(result.session).toBeNull();
    expect(result.redirectResponse).toBeDefined();
    expect(result.redirectResponse?.status).toBe(403);
    expect(result.projectRole).toBeNull();
  });

  it('defaults minRole to user when not specified', async () => {
    // Mock requireSession returning authenticated session
    vi.mocked(requireSession).mockResolvedValue({
      session: MOCK_SESSION,
      redirectResponse: null,
    });

    // Mock resolveRole returning 'user' (not a global admin)
    vi.mocked(resolveRole).mockReturnValue('user');

    // Mock DB returning user membership
    vi.mocked(db.select).mockImplementation(mockMembershipQuery([{ role: 'user' }]));

    // Call without minRole parameter
    const result = await requireProjectRole(1);

    expect(result.session).toEqual(MOCK_SESSION);
    expect(result.redirectResponse).toBeNull();
    expect(result.projectRole).toBe('user');
  });
});
