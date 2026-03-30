import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

// Use vi.hoisted so the mock variable is available in the vi.mock factory
const { mockDbInsert } = vi.hoisted(() => {
  const mockDbInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue([{ id: 99 }]),
  });
  return { mockDbInsert };
});

vi.mock('../../db', () => ({
  db: {
    insert: mockDbInsert,
  },
}));

import { insertSchedulerFailureNotification } from '../../lib/scheduler-notifications';

describe('insertSchedulerFailureNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue([{ id: 99 }]),
    });
  });

  it("inserts row into app_notifications with type='scheduler_failure'", async () => {
    await insertSchedulerFailureNotification(1, 'Morning Briefing', 'Connection timeout');
    expect(mockDbInsert).toHaveBeenCalledOnce();
    const insertCallArg = mockDbInsert.mock.calls[0][0];
    // The table passed to insert should be the app_notifications table
    expect(insertCallArg).toBeDefined();
    const valuesCall = mockDbInsert.mock.results[0].value.values;
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'scheduler_failure' })
    );
  });

  it('notification title includes jobName', async () => {
    await insertSchedulerFailureNotification(2, 'Weekly Status', 'Timeout error');
    const valuesCall = mockDbInsert.mock.results[0].value.values;
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Weekly Status'),
      })
    );
  });

  it('notification body is truncated to 500 chars', async () => {
    const longError = 'x'.repeat(600);
    await insertSchedulerFailureNotification(3, 'Discovery Scan', longError);
    const valuesCall = mockDbInsert.mock.results[0].value.values;
    const callArg = valuesCall.mock.calls[0][0];
    expect(callArg.body.length).toBeLessThanOrEqual(500);
  });
});
