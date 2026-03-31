// tests/auth/proxy.test.ts
// GREEN — AUTH-05: proxy.ts redirects to /login with no session cookie
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/db', () => ({ db: {} }));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));

// Mock better-auth/cookies — getSessionCookie is edge-safe cookie existence check
vi.mock('better-auth/cookies', () => ({
  getSessionCookie: vi.fn(),
}));

import { getSessionCookie } from 'better-auth/cookies';
import { proxy } from '@/proxy';

const mockGetSessionCookie = vi.mocked(getSessionCookie);

describe('proxy() — AUTH-05', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns NextResponse.redirect to /login when no session cookie is present', async () => {
    mockGetSessionCookie.mockReturnValue(null as any);
    const req = new NextRequest('http://localhost/dashboard');
    const response = await proxy(req);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  it('returns NextResponse.next() when session cookie is present', async () => {
    mockGetSessionCookie.mockReturnValue('session-token-value' as any);
    const req = new NextRequest('http://localhost/dashboard');
    const response = await proxy(req);
    // NextResponse.next() has status 200 and no redirect
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('does not redirect on /login path (exclusion pattern)', async () => {
    mockGetSessionCookie.mockReturnValue(null as any);
    const req = new NextRequest('http://localhost/login');
    const response = await proxy(req);
    expect(response.status).not.toBe(307);
  });

  it('does not redirect on /setup path (exclusion pattern)', async () => {
    mockGetSessionCookie.mockReturnValue(null as any);
    const req = new NextRequest('http://localhost/setup');
    const response = await proxy(req);
    expect(response.status).not.toBe(307);
  });

  it('does not redirect on /api/auth/... paths (exclusion pattern)', async () => {
    mockGetSessionCookie.mockReturnValue(null as any);
    const req = new NextRequest('http://localhost/api/auth/signin');
    const response = await proxy(req);
    expect(response.status).not.toBe(307);
  });
});
