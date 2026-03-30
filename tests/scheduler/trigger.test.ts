import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

// Mock BullMQ Queue to avoid real Redis I/O.
// Uses a regular function (not arrow) as the constructor implementation — Vitest 4
// requires function/class implementations when the mock is used with `new`.
vi.mock('bullmq', () => ({
  Queue: vi.fn(function (this: unknown) {
    return {
      add: vi.fn().mockResolvedValue({ id: 'job-123' }),
      close: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

vi.mock('../../db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 1,
            name: 'Test Job',
            skill_name: 'morning-briefing',
            enabled: true,
          },
        ]),
      }),
    }),
  },
}));

import { POST } from '../../app/api/jobs/trigger/route';

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/jobs/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/jobs/trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('with {jobId, skillName} enqueues the job and returns 200', async () => {
    const req = makeRequest({ jobId: 1, skillName: 'morning-briefing' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.queued).toBe(true);
  });

  it('with unknown skillName returns 400', async () => {
    const req = makeRequest({ jobId: 1, skillName: 'nonexistent-skill-xyz' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
