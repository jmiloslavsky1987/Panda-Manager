// @vitest-environment jsdom
// tests/sync/active-blockers.test.tsx
// RED tests for SYNC-03 — blocked task list in HealthDashboard
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { HealthDashboard } from '@/components/HealthDashboard'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

describe('SYNC-03: blocked task list in HealthDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('HealthDashboard renders a list of blocked task titles', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          stepCounts: [
            { track: 'ADR', status: 'blocked', count: 2 },
          ],
          riskCounts: [],
          integrationCounts: [],
          milestoneOnTrack: [],
          weeklyRollup: [],
          weeklyTarget: null,
          totalHoursThisWeek: 0,
          blockedTasks: [
            { id: 1, title: 'Fix auth bug', status: 'blocked' },
            { id: 2, title: 'Deploy to staging', status: 'blocked' },
          ],
        }),
      } as Response)
    )

    render(<HealthDashboard projectId={1} />)

    await waitFor(() => {
      expect(screen.getByTestId('health-dashboard')).toBeDefined()
    })

    // This will FAIL because HealthDashboard currently shows a count, not a task list
    expect(screen.getByText('Fix auth bug')).toBeDefined()
    expect(screen.getByText('Deploy to staging')).toBeDefined()
  })

  it('HealthDashboard blocked task links point to the Task Board URL', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          stepCounts: [],
          riskCounts: [],
          integrationCounts: [],
          milestoneOnTrack: [],
          weeklyRollup: [],
          weeklyTarget: null,
          totalHoursThisWeek: 0,
          blockedTasks: [
            { id: 1, title: 'Blocked task one', status: 'blocked' },
          ],
        }),
      } as Response)
    )

    render(<HealthDashboard projectId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Blocked task one')).toBeDefined()
    })

    // This will FAIL because the link doesn't exist yet
    const link = screen.getByText('Blocked task one').closest('a')
    expect(link?.getAttribute('href')).toBe('/customer/1/plan/tasks')
  })

  it('HealthDashboard shows "No blocked tasks" when none are blocked', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          stepCounts: [],
          riskCounts: [],
          integrationCounts: [],
          milestoneOnTrack: [],
          weeklyRollup: [],
          weeklyTarget: null,
          totalHoursThisWeek: 0,
          blockedTasks: [],
        }),
      } as Response)
    )

    render(<HealthDashboard projectId={1} />)

    await waitFor(() => {
      expect(screen.getByTestId('health-dashboard')).toBeDefined()
    })

    // This will FAIL because the empty state message doesn't exist yet
    expect(screen.getByText(/no blocked tasks/i)).toBeDefined()
  })

  it('HealthDashboard truncates list at 5 blocked tasks with "and N more"', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          stepCounts: [],
          riskCounts: [],
          integrationCounts: [],
          milestoneOnTrack: [],
          weeklyRollup: [],
          weeklyTarget: null,
          totalHoursThisWeek: 0,
          blockedTasks: [
            { id: 1, title: 'Task 1', status: 'blocked' },
            { id: 2, title: 'Task 2', status: 'blocked' },
            { id: 3, title: 'Task 3', status: 'blocked' },
            { id: 4, title: 'Task 4', status: 'blocked' },
            { id: 5, title: 'Task 5', status: 'blocked' },
            { id: 6, title: 'Task 6', status: 'blocked' },
            { id: 7, title: 'Task 7', status: 'blocked' },
            { id: 8, title: 'Task 8', status: 'blocked' },
          ],
        }),
      } as Response)
    )

    render(<HealthDashboard projectId={1} />)

    await waitFor(() => {
      expect(screen.getByTestId('health-dashboard')).toBeDefined()
    })

    // This will FAIL because truncation logic doesn't exist yet
    // Should show first 5 tasks
    expect(screen.getByText('Task 1')).toBeDefined()
    expect(screen.getByText('Task 5')).toBeDefined()
    // Should NOT show tasks 6-8
    expect(screen.queryByText('Task 6')).toBeNull()
    expect(screen.queryByText('Task 8')).toBeNull()
    // Should show "and 3 more"
    expect(screen.getByText(/and 3 more/i)).toBeDefined()
  })
})
