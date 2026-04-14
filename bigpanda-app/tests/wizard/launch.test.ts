import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only and DB before importing route
vi.mock('server-only', () => ({}));
vi.mock('@/lib/seed-project', () => ({
  seedProjectFromRegistry: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../db', () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1, status: 'active' }]),
        }),
      }),
    }),
  },
}));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({ user: { id: 'test-user', email: 'test@test.com', role: 'admin' } }),
    },
  },
}));

import { PATCH } from '../../app/api/projects/[projectId]/route';

function makeRequest(body: Record<string, unknown>, projectId?: string): Request {
  const url = `http://localhost/api/projects/${projectId ?? '1'}`;
  return new Request(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('launch: PATCH /api/projects/[projectId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { ok: true } for valid projectId with status active', async () => {
    const req = makeRequest({ status: 'active' }, '1');
    const params = Promise.resolve({ projectId: '1' });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('returns 400 for invalid (non-numeric) projectId', async () => {
    const req = makeRequest({ status: 'active' }, 'invalid-id');
    const params = Promise.resolve({ projectId: 'invalid-id' });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(400);
  });
});
