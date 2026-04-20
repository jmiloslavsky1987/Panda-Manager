// tests/auth/portfolio-isolation.test.ts
// RED — TENANT-01: Portfolio returns only user's projects
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server before importing route handlers
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
  NextRequest: vi.fn(),
}));

// Mock next/headers (returns empty headers by default)
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock db to avoid real connection
vi.mock('@/db', () => ({ db: {} }));

// Mock auth module
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock lib/queries to spy on getActiveProjects
vi.mock('@/lib/queries', () => ({
  getActiveProjects: vi.fn(),
}));

// Import after mocks are set up
import { GET } from '@/app/api/projects/route';
import { getActiveProjects } from '@/lib/queries';
import { auth } from '@/lib/auth';

const mockGetSession = vi.mocked(auth.api.getSession);
const mockGetActiveProjects = vi.mocked(getActiveProjects);

beforeEach(() => {
  mockGetSession.mockReset();
  mockGetActiveProjects.mockReset();
});

describe('Portfolio Isolation — TENANT-01', () => {
  it('GET /api/projects passes userId to getActiveProjects when called by a regular user', async () => {
    // Mock a regular user session
    const fakeSession = {
      user: { id: 'user-123', email: 'regular@example.com', role: 'user' },
    };
    mockGetSession.mockResolvedValue(fakeSession as any);
    mockGetActiveProjects.mockResolvedValue([]);

    // Call the route handler
    const req = {} as any; // NextRequest not used in GET
    await GET(req);

    // Assert getActiveProjects was called with userId and isGlobalAdmin:false
    // This WILL FAIL because the current implementation calls getActiveProjects() without arguments
    expect(mockGetActiveProjects).toHaveBeenCalledWith({
      userId: 'user-123',
      isGlobalAdmin: false,
    });
  });

  it('GET /api/projects calls getActiveProjects with isGlobalAdmin:true when called by a global admin', async () => {
    // Mock a global admin session
    const adminSession = {
      user: { id: 'admin-456', email: 'admin@example.com', role: 'admin' },
    };
    mockGetSession.mockResolvedValue(adminSession as any);
    mockGetActiveProjects.mockResolvedValue([]);

    // Call the route handler
    const req = {} as any;
    await GET(req);

    // Assert getActiveProjects was called with isGlobalAdmin:true
    // This WILL FAIL because the current implementation calls getActiveProjects() without arguments
    expect(mockGetActiveProjects).toHaveBeenCalledWith({
      userId: 'admin-456',
      isGlobalAdmin: true,
    });
  });

  it('GET /api/projects returns empty array for user with no project memberships', async () => {
    // Mock a user session with no memberships
    const fakeSession = {
      user: { id: 'new-user-789', email: 'newuser@example.com', role: 'user' },
    };
    mockGetSession.mockResolvedValue(fakeSession as any);
    // Mock getActiveProjects to return empty array for this user
    mockGetActiveProjects.mockResolvedValue([]);

    // Call the route handler
    const req = {} as any;
    const response = await GET(req);

    // Assert the response is an empty array
    // This WILL FAIL if getActiveProjects is not called with the correct userId
    expect(response.body).toEqual({ projects: [] });
  });
});
