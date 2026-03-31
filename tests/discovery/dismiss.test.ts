import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB — vi.mock is hoisted, use inline vi.fn() factories
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock db/schema
vi.mock('@/db/schema', () => ({
  discoveryItems: {
    id: 'id',
    project_id: 'project_id',
    source: 'source',
    content: 'content',
    suggested_field: 'suggested_field',
    status: 'status',
    scan_timestamp: 'scan_timestamp',
    source_url: 'source_url',
    source_excerpt: 'source_excerpt',
    scan_id: 'scan_id',
    created_at: 'created_at',
  },
}));

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
  inArray: vi.fn((col, vals) => ({ col, vals })),
  desc: vi.fn((col) => ({ col, dir: 'desc' })),
}));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({ user: { id: 'test-user', email: 'test@test.com', role: 'admin' } }),
    },
  },
}));

import { POST as POSTDismiss } from '@/app/api/discovery/dismiss/route';
import { GET as GETHistory } from '@/app/api/discovery/dismiss-history/route';
import { db } from '@/db';
import { auth as authMock } from '@/lib/auth';
import { NextRequest } from 'next/server';

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/discovery/dismiss', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(url: string): NextRequest {
  return new NextRequest(url);
}

// Setup chainable update mock
function setupDbUpdate(rowsAffected = 1) {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(Array(rowsAffected).fill({})),
  };
  vi.mocked(db.update).mockReturnValue(chain as any);
  return chain;
}

// Setup chainable select mock
function setupDbSelect(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
  };
  vi.mocked(db.select).mockReturnValue(chain as any);
  return chain;
}

beforeEach(() => {
  vi.resetAllMocks();
  // Restore auth mock after resetAllMocks clears it
  vi.mocked(authMock.api.getSession).mockResolvedValue({ user: { id: 'test-user', email: 'test@test.com', role: 'admin' } } as any);
});

describe('POST /api/discovery/dismiss', () => {
  it('DISC-15: dismissed item has status=dismissed not deleted', async () => {
    const updateChain = setupDbUpdate(1);

    const req = makePostRequest({ projectId: 42, itemIds: [10] });
    const res = await POSTDismiss(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.dismissed).toBe(1);

    // Verify UPDATE was called (not DELETE)
    expect(db.update).toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();

    // Verify the SET includes status='dismissed'
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'dismissed' })
    );
  });

  it('DISC-15: bulk dismiss works — multiple IDs processed', async () => {
    setupDbUpdate(3);

    const req = makePostRequest({ projectId: 42, itemIds: [10, 11, 12] });
    const res = await POSTDismiss(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.dismissed).toBeGreaterThanOrEqual(1);

    // Only one UPDATE call (batch via inArray)
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it('DISC-15: dismissed item appears in dismiss-history endpoint', async () => {
    const dismissedItem = {
      id: 10,
      project_id: 42,
      source: 'jira',
      content: 'An old action',
      suggested_field: 'action',
      status: 'dismissed',
      scan_timestamp: new Date('2026-03-20T10:00:00Z'),
      source_url: null,
      source_excerpt: null,
      scan_id: 'scan-42-old',
      created_at: new Date('2026-03-20T10:00:00Z'),
    };

    setupDbSelect([dismissedItem]);

    const req = makeGetRequest('http://localhost/api/discovery/dismiss-history?projectId=42');
    const res = await GETHistory(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toHaveProperty('status', 'dismissed');
    expect(data.items[0]).toHaveProperty('id', 10);
  });
});
