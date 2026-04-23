import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that load the modules
// ---------------------------------------------------------------------------

vi.mock('@/lib/queries', () => ({
  getTasksForProject: vi.fn(),
  getWorkspaceData: vi.fn(),
}));

import { buildMeetingPrepContext } from '@/lib/meeting-prep-context';
import { getTasksForProject, getWorkspaceData } from '@/lib/queries';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date('2026-04-23T12:00:00Z');
const FIVE_DAYS_AGO = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
const TEN_DAYS_AGO = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

function makeTask(overrides: Partial<{ id: number; title: string; status: string; created_at: Date }> = {}) {
  return {
    id: overrides.id ?? 1,
    title: overrides.title ?? 'Test Task',
    status: overrides.status ?? 'open',
    created_at: overrides.created_at ?? new Date(NOW),
    project_id: 1,
    description: null,
    owner: null,
    owner_id: null,
    due: null,
    start_date: null,
    priority: null,
    type: 'task',
    phase: null,
    blocked_by: null,
    milestone_id: null,
    source: 'manual',
    source_artifact_id: null,
    ingested_at: null,
    workstream_id: null,
    is_blocked: false,
    milestone_name: null,
  };
}

function makeAction(overrides: Partial<{ id: number; description: string; status: string; created_at: Date }> = {}) {
  return {
    id: overrides.id ?? 1,
    description: overrides.description ?? 'Test Action',
    status: overrides.status ?? 'open',
    created_at: overrides.created_at ?? new Date(NOW),
    project_id: 1,
    external_id: 'A-001',
    owner: null,
    owner_id: null,
    due: null,
    last_updated: null,
    notes: null,
    type: 'action',
    source: 'manual',
    source_artifact_id: null,
    discovery_source: null,
    ingested_at: null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildMeetingPrepContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Test 1: returns string containing "Open Items" section', async () => {
    vi.mocked(getTasksForProject).mockResolvedValue([]);
    vi.mocked(getWorkspaceData).mockResolvedValue({ actions: [], workstreams: [], risks: [], milestones: [], engagementHistory: [], keyDecisions: [], stakeholders: [], artifacts: [], wbsItems: [] } as any);

    const result = await buildMeetingPrepContext(1);

    expect(typeof result).toBe('string');
    expect(result).toContain('Open Items');
  });

  it('Test 2: open tasks filter excludes tasks with status done or cancelled', async () => {
    // Use old created_at so done/cancelled tasks do NOT appear in recent activity either
    const oldDate = new Date(TEN_DAYS_AGO);
    const openTask = makeTask({ id: 1, title: 'Open Task', status: 'open', created_at: oldDate });
    const doneTask = makeTask({ id: 2, title: 'Done Task', status: 'done', created_at: oldDate });
    const cancelledTask = makeTask({ id: 3, title: 'Cancelled Task', status: 'cancelled', created_at: oldDate });
    const inProgressTask = makeTask({ id: 4, title: 'In Progress Task', status: 'in_progress', created_at: oldDate });

    vi.mocked(getTasksForProject).mockResolvedValue([openTask, doneTask, cancelledTask, inProgressTask]);
    vi.mocked(getWorkspaceData).mockResolvedValue({ actions: [] } as any);

    const result = await buildMeetingPrepContext(1);

    expect(result).toContain('Open Task');
    expect(result).toContain('In Progress Task');
    expect(result).not.toContain('Done Task');
    expect(result).not.toContain('Cancelled Task');
  });

  it('Test 3: open actions filter excludes actions with status completed or cancelled', async () => {
    // Use old created_at so completed/cancelled actions do NOT appear in recent activity either
    const oldDate = new Date(TEN_DAYS_AGO);
    const openAction = makeAction({ id: 1, description: 'Open Action', status: 'open', created_at: oldDate });
    const completedAction = makeAction({ id: 2, description: 'Completed Action', status: 'completed', created_at: oldDate });
    const cancelledAction = makeAction({ id: 3, description: 'Cancelled Action', status: 'cancelled', created_at: oldDate });
    const inProgressAction = makeAction({ id: 4, description: 'In Progress Action', status: 'in_progress', created_at: oldDate });

    vi.mocked(getTasksForProject).mockResolvedValue([]);
    vi.mocked(getWorkspaceData).mockResolvedValue({ actions: [openAction, completedAction, cancelledAction, inProgressAction] } as any);

    const result = await buildMeetingPrepContext(1);

    expect(result).toContain('Open Action');
    expect(result).toContain('In Progress Action');
    expect(result).not.toContain('Completed Action');
    expect(result).not.toContain('Cancelled Action');
  });

  it('Test 4: recent tasks filter includes only tasks with status done AND created_at within 7 days', async () => {
    const recentDoneTask = makeTask({ id: 1, title: 'Recent Done Task', status: 'done', created_at: new Date(FIVE_DAYS_AGO) });
    const oldDoneTask = makeTask({ id: 2, title: 'Old Done Task', status: 'done', created_at: new Date(TEN_DAYS_AGO) });
    const recentOpenTask = makeTask({ id: 3, title: 'Recent Open Task', status: 'open', created_at: new Date(FIVE_DAYS_AGO) });

    vi.mocked(getTasksForProject).mockResolvedValue([recentDoneTask, oldDoneTask, recentOpenTask]);
    vi.mocked(getWorkspaceData).mockResolvedValue({ actions: [] } as any);

    const result = await buildMeetingPrepContext(1);

    expect(result).toContain('Recent Done Task');
    expect(result).not.toContain('Old Done Task');
    // Recent open task should appear in open items, not recent activity
    expect(result).toContain('Recent Open Task');
  });

  it('Test 5: recent actions filter includes only actions with status completed AND created_at within 7 days', async () => {
    const recentCompletedAction = makeAction({ id: 1, description: 'Recent Completed Action', status: 'completed', created_at: new Date(FIVE_DAYS_AGO) });
    const oldCompletedAction = makeAction({ id: 2, description: 'Old Completed Action', status: 'completed', created_at: new Date(TEN_DAYS_AGO) });
    const recentOpenAction = makeAction({ id: 3, description: 'Recent Open Action', status: 'open', created_at: new Date(FIVE_DAYS_AGO) });

    vi.mocked(getTasksForProject).mockResolvedValue([]);
    vi.mocked(getWorkspaceData).mockResolvedValue({ actions: [recentCompletedAction, oldCompletedAction, recentOpenAction] } as any);

    const result = await buildMeetingPrepContext(1);

    expect(result).toContain('Recent Completed Action');
    expect(result).not.toContain('Old Completed Action');
    expect(result).toContain('Recent Open Action');
  });

  it('Test 6: user input is escaped (strips <> chars) before interpolation into context string', async () => {
    vi.mocked(getTasksForProject).mockResolvedValue([]);
    vi.mocked(getWorkspaceData).mockResolvedValue({ actions: [] } as any);

    const maliciousInput = 'Meeting about <script>alert("xss")</script> security';
    const result = await buildMeetingPrepContext(1, maliciousInput);

    expect(result).not.toContain('<script>');
    expect(result).not.toContain('</script>');
    expect(result).toContain('script');
    expect(result).toContain('Meeting about');
  });
});
