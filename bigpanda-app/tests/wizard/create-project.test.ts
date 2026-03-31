import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only and DB before importing route
vi.mock('server-only', () => ({}));
vi.mock('../../db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 42, name: 'Test Project', customer: 'ACME', status: 'draft' }]),
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

import { POST } from '../../app/api/projects/route';

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('create-project: POST /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a project with name, customer, description, start_date, end_date and returns 201 with id', async () => {
    const req = makeRequest({
      name: 'Test Project',
      customer: 'ACME',
      description: 'A test project',
      start_date: '2026-04-01',
      end_date: '2026-12-31',
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.project).toBeDefined();
    expect(json.project.id).toBeDefined();
  });

  it('returns 400 when name is missing', async () => {
    const req = makeRequest({ customer: 'ACME' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
