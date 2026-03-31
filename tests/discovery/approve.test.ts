import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB — vi.mock is hoisted, use inline vi.fn() factories (not top-level const — hoisting)
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock db/schema with minimal shape
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
  actions: { id: 'id', project_id: 'project_id', external_id: 'external_id', description: 'description', source: 'source' },
  risks: { id: 'id', project_id: 'project_id', external_id: 'external_id', description: 'description', source: 'source' },
  milestones: { id: 'id', project_id: 'project_id', external_id: 'external_id', name: 'name', source: 'source' },
  keyDecisions: { id: 'id', project_id: 'project_id', decision: 'decision', source: 'source' },
  engagementHistory: { id: 'id', project_id: 'project_id', content: 'content', source: 'source' },
  stakeholders: { id: 'id', project_id: 'project_id', name: 'name', source: 'source' },
}));

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
  inArray: vi.fn((col, vals) => ({ col, vals })),
}));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({ user: { id: 'test-user', email: 'test@test.com', role: 'admin' } }),
    },
  },
}));

import { POST } from '@/app/api/discovery/approve/route';
import { db } from '@/db';
import { auth as authMock } from '@/lib/auth';
import { NextRequest } from 'next/server';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/discovery/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Setup chainable mock for select — returns specified rows
function setupDbSelect(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
  vi.mocked(db.select).mockReturnValue(chain as any);
  return chain;
}

// Setup chainable mock for insert
function setupDbInsert() {
  const chain = {
    values: vi.fn().mockResolvedValue([{ id: 999 }]),
  };
  vi.mocked(db.insert).mockReturnValue(chain as any);
  return chain;
}

// Setup chainable mock for update
function setupDbUpdate() {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };
  vi.mocked(db.update).mockReturnValue(chain as any);
  return chain;
}

beforeEach(() => {
  vi.resetAllMocks();
  // Restore auth mock after resetAllMocks clears it
  vi.mocked(authMock.api.getSession).mockResolvedValue({ user: { id: 'test-user', email: 'test@test.com', role: 'admin' } } as any);
});

describe('POST /api/discovery/approve', () => {
  it('DISC-14: approved action item written to actions table with source=discovery', async () => {
    const discoveryItem = {
      id: 1,
      project_id: 42,
      source: 'jira',
      content: 'Integrate with Slack',
      suggested_field: 'action',
      status: 'pending',
      scan_timestamp: new Date('2026-03-26T10:00:00Z'),
      source_url: null,
      source_excerpt: 'We should integrate with Slack',
      scan_id: 'scan-42-1711447200',
      created_at: new Date('2026-03-26T10:00:00Z'),
    };

    setupDbSelect([discoveryItem]);
    const insertChain = setupDbInsert();
    setupDbUpdate();

    const req = makeRequest({ projectId: 42, itemIds: [1] });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.approved).toBe(1);
    expect(data.errors).toHaveLength(0);

    // Verify insert was called on actions table
    expect(db.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'id', external_id: 'external_id' }) // actions table shape
    );
    // Verify source='discovery' in insert values
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'discovery' })
    );
  });

  it('DISC-14: approved risk item written to risks table with source=discovery', async () => {
    const discoveryItem = {
      id: 2,
      project_id: 42,
      source: 'confluence',
      content: 'Data breach risk from third-party integrations',
      suggested_field: 'risk',
      status: 'pending',
      scan_timestamp: new Date('2026-03-26T10:00:00Z'),
      source_url: null,
      source_excerpt: null,
      scan_id: 'scan-42-1711447200',
      created_at: new Date('2026-03-26T10:00:00Z'),
    };

    setupDbSelect([discoveryItem]);
    const insertChain = setupDbInsert();
    setupDbUpdate();

    const req = makeRequest({ projectId: 42, itemIds: [2] });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.approved).toBe(1);

    // Verify insert was called on risks table
    expect(db.insert).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'description' }) // risks table shape
    );
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'discovery' })
    );
  });

  it('DISC-14: approved item has scan_timestamp in attribution (discovery_item status set to approved)', async () => {
    const scanTs = new Date('2026-03-26T10:00:00Z');
    const discoveryItem = {
      id: 3,
      project_id: 42,
      source: 'jira',
      content: 'Deploy production environment',
      suggested_field: 'milestone',
      status: 'pending',
      scan_timestamp: scanTs,
      source_url: null,
      source_excerpt: 'Deploy to prod by Q2',
      scan_id: 'scan-42-1711447200',
      created_at: new Date('2026-03-26T10:00:00Z'),
    };

    setupDbSelect([discoveryItem]);
    setupDbInsert();
    const updateChain = setupDbUpdate();

    const req = makeRequest({ projectId: 42, itemIds: [3] });
    const res = await POST(req);

    expect(res.status).toBe(200);

    // Verify discoveryItems update was called to mark status='approved'
    expect(db.update).toHaveBeenCalled();
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' })
    );
  });

  it('DISC-13: bulk array of IDs all processed', async () => {
    const items = [
      {
        id: 4,
        project_id: 42,
        source: 'jira',
        content: 'Action 1',
        suggested_field: 'action',
        status: 'pending',
        scan_timestamp: new Date(),
        source_url: null,
        source_excerpt: null,
        scan_id: 'scan-42-bulk',
        created_at: new Date(),
      },
      {
        id: 5,
        project_id: 42,
        source: 'jira',
        content: 'Risk 1',
        suggested_field: 'risk',
        status: 'pending',
        scan_timestamp: new Date(),
        source_url: null,
        source_excerpt: null,
        scan_id: 'scan-42-bulk',
        created_at: new Date(),
      },
    ];

    // Each itemId will trigger a separate db.select + db.insert + db.update
    // Setup select to return matching item on each call
    let callCount = 0;
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(() => {
        const item = items[callCount++];
        return Promise.resolve(item ? [item] : []);
      }),
    };
    vi.mocked(db.select).mockReturnValue(selectChain as any);
    setupDbInsert();
    setupDbUpdate();

    const req = makeRequest({ projectId: 42, itemIds: [4, 5] });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.approved).toBe(2);
    expect(db.insert).toHaveBeenCalledTimes(2);
  });
});
