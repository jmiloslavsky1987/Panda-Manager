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
  desc: vi.fn((col) => ({ col, dir: 'desc' })),
}));

import { GET as GETQueue } from '@/app/api/discovery/queue/route';
import { GET as GETHistory } from '@/app/api/discovery/dismiss-history/route';
import { db } from '@/db';
import { NextRequest } from 'next/server';

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

// Setup chainable mock that returns data
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
});

describe('GET /api/discovery/queue', () => {
  it('DISC-11: queue item has source, scan_timestamp, source_excerpt, suggested_field, content fields', async () => {
    const mockItems = [
      {
        id: 1,
        project_id: 42,
        source: 'jira',
        content: 'Integrate with Slack',
        suggested_field: 'action',
        status: 'pending',
        scan_timestamp: new Date('2026-03-26T10:00:00Z'),
        source_url: 'https://jira.example.com/BP-123',
        source_excerpt: 'We should integrate with Slack for notifications',
        scan_id: 'scan-42-1711447200',
        created_at: new Date('2026-03-26T10:00:00Z'),
      },
    ];

    setupDbSelect(mockItems);

    const req = makeRequest('http://localhost/api/discovery/queue?projectId=42');
    const res = await GETQueue(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(1);

    const item = data.items[0];
    expect(item).toHaveProperty('source', 'jira');
    expect(item).toHaveProperty('content', 'Integrate with Slack');
    expect(item).toHaveProperty('suggested_field', 'action');
    expect(item).toHaveProperty('scan_timestamp');
    expect(item).toHaveProperty('source_excerpt', 'We should integrate with Slack for notifications');
    expect(item).toHaveProperty('source_url');
    expect(item).toHaveProperty('status', 'pending');
    expect(item).toHaveProperty('id', 1);
  });

  it('DISC-16: items remain pending until explicitly acted upon (no time-based filtering)', async () => {
    // Items from different timestamps — all should be returned
    const oldItem = {
      id: 2,
      project_id: 42,
      source: 'confluence',
      content: 'Old action item from months ago',
      suggested_field: 'action',
      status: 'pending',
      scan_timestamp: new Date('2025-01-01T00:00:00Z'), // Very old item
      source_url: null,
      source_excerpt: 'Old excerpt',
      scan_id: 'scan-42-old',
      created_at: new Date('2025-01-01T00:00:00Z'),
    };
    const newItem = {
      id: 3,
      project_id: 42,
      source: 'confluence',
      content: 'Recent item',
      suggested_field: 'risk',
      status: 'pending',
      scan_timestamp: new Date('2026-03-26T00:00:00Z'),
      source_url: null,
      source_excerpt: 'Recent excerpt',
      scan_id: 'scan-42-new',
      created_at: new Date('2026-03-26T00:00:00Z'),
    };

    setupDbSelect([oldItem, newItem]);

    const req = makeRequest('http://localhost/api/discovery/queue?projectId=42');
    const res = await GETQueue(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    // Both items returned — no expiry filtering
    expect(data.items).toHaveLength(2);
    expect(data.items.map((i: any) => i.id)).toContain(2); // old item still present
    expect(data.items.map((i: any) => i.id)).toContain(3);
  });

  it('returns 400 if projectId is missing', async () => {
    const req = makeRequest('http://localhost/api/discovery/queue');
    const res = await GETQueue(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/discovery/dismiss-history', () => {
  it('returns dismissed items for a project', async () => {
    const dismissedItem = {
      id: 10,
      project_id: 42,
      source: 'jira',
      content: 'Dismissed action',
      suggested_field: 'action',
      status: 'dismissed',
      scan_timestamp: new Date('2026-03-20T10:00:00Z'),
      source_url: null,
      source_excerpt: 'An excerpt',
      scan_id: 'scan-42-1711447200',
      created_at: new Date('2026-03-20T10:00:00Z'),
    };

    setupDbSelect([dismissedItem]);

    const req = makeRequest('http://localhost/api/discovery/dismiss-history?projectId=42');
    const res = await GETHistory(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toHaveProperty('status', 'dismissed');
    expect(data.items[0]).toHaveProperty('id', 10);
  });

  it('returns 400 if projectId is missing', async () => {
    const req = makeRequest('http://localhost/api/discovery/dismiss-history');
    const res = await GETHistory(req);
    expect(res.status).toBe(400);
  });
});
