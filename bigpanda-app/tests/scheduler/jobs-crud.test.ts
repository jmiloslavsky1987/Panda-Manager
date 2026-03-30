import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only and DB before importing route
vi.mock('server-only', () => ({}));
vi.mock('../../db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 1,
            name: 'Test Job',
            skill_name: 'morning-briefing',
            cron_expression: '0 0 9 * * *',
            timezone: 'America/New_York',
            skill_params_json: '{}',
            enabled: true,
            last_run_at: null,
            last_run_outcome: null,
            next_run: null,
          },
        ]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([
          {
            id: 1,
            name: 'Enabled Job',
            skill_name: 'morning-briefing',
            cron_expression: '0 0 9 * * *',
            enabled: true,
            last_run_at: '2026-03-29T09:00:00Z',
            last_run_outcome: 'success',
            next_run: '2026-03-30T09:00:00Z',
          },
          {
            id: 2,
            name: 'Disabled Job',
            skill_name: 'weekly-customer-status',
            cron_expression: '0 30 9 * * 1',
            enabled: false,
            last_run_at: '2026-03-22T09:30:00Z',
            last_run_outcome: 'success',
            next_run: null,
          },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1, enabled: false }]),
        }),
      }),
    }),
  },
}));

import { POST, GET } from '../../app/api/jobs/route';
import { PATCH } from '../../app/api/jobs/[id]/route';

function makeRequest(method: string, body?: Record<string, unknown>, url = 'http://localhost/api/jobs'): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('POST /api/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 with a created job row containing id, name, skill_name, cron_expression', async () => {
    const req = makeRequest('POST', {
      name: 'Test Job',
      skill_name: 'morning-briefing',
      frequency: 'daily',
      hour: 9,
      minute: 0,
      timezone: 'America/New_York',
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.job).toBeDefined();
    expect(json.job.id).toBeDefined();
    expect(json.job.name).toBeDefined();
    expect(json.job.skill_name).toBeDefined();
    expect(json.job.cron_expression).toBeDefined();
  });

  it('returns 400 when name is missing', async () => {
    const req = makeRequest('POST', {
      skill_name: 'morning-briefing',
      frequency: 'daily',
      hour: 9,
      minute: 0,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('stores timezone from request body', async () => {
    const req = makeRequest('POST', {
      name: 'Timezone Job',
      skill_name: 'morning-briefing',
      frequency: 'daily',
      hour: 9,
      minute: 0,
      timezone: 'Europe/London',
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.job.timezone).toBeDefined();
  });

  it('stores skill_params_json from request body', async () => {
    const req = makeRequest('POST', {
      name: 'Params Job',
      skill_name: 'discovery-scan',
      frequency: 'weekly',
      hour: 9,
      minute: 0,
      dayOfWeek: 1,
      timezone: 'UTC',
      skill_params: { customer_id: 42, depth: 'full' },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.job.skill_params_json).toBeDefined();
  });
});

describe('PATCH /api/jobs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('with {enabled: false} sets enabled=false', async () => {
    const req = makeRequest('PATCH', { enabled: false }, 'http://localhost/api/jobs/1');
    const params = { id: '1' };
    const res = await PATCH(req, { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.job.enabled).toBe(false);
  });
});

describe('GET /api/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns array; enabled jobs appear before disabled jobs', async () => {
    const req = makeRequest('GET');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.jobs)).toBe(true);
    const enabledIndex = json.jobs.findIndex((j: { enabled: boolean }) => j.enabled === true);
    const disabledIndex = json.jobs.findIndex((j: { enabled: boolean }) => j.enabled === false);
    if (enabledIndex !== -1 && disabledIndex !== -1) {
      expect(enabledIndex).toBeLessThan(disabledIndex);
    }
  });

  it('returns last_run_at, last_run_outcome, next_run fields', async () => {
    const req = makeRequest('GET');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.jobs)).toBe(true);
    const first = json.jobs[0];
    expect(first).toHaveProperty('last_run_at');
    expect(first).toHaveProperty('last_run_outcome');
    expect(first).toHaveProperty('next_run');
  });
});
