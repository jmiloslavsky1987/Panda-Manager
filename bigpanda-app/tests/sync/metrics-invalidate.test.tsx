// @vitest-environment jsdom
// tests/sync/metrics-invalidate.test.tsx
// RED tests for SYNC-01 — custom event dispatch and listener for metrics invalidation
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ActionsTableClient } from '@/components/ActionsTableClient'
import { OverviewMetrics } from '@/components/OverviewMetrics'
import { HealthDashboard } from '@/components/HealthDashboard'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
    toString: vi.fn(() => ''),
  }),
}))

describe('SYNC-01: metrics:invalidate event', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
        }),
      } as Response)
    )
  })

  it('dispatches metrics:invalidate event after successful PATCH in ActionsTableClient', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const mockActions = [
      {
        id: 1,
        external_id: 'ACT-001',
        description: 'Test action',
        status: 'open',
        owner: 'Alice',
        due: '2026-04-15',
        source: 'manual',
        source_artifact_id: null,
        discovery_source: null,
        project_id: 1,
        created_at: '2026-04-01',
        updated_at: '2026-04-01',
      },
    ]

    render(<ActionsTableClient actions={mockActions} projectId={1} />)

    // This test will FAIL because ActionsTableClient doesn't dispatch the event yet
    // Expected: After PATCH succeeds, window.dispatchEvent should be called with CustomEvent('metrics:invalidate')

    // Simulate inline edit save (this is what patchAction does)
    // For now, we just assert the expectation - implementation will make it pass
    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'metrics:invalidate',
        })
      )
    })
  })

  it('OverviewMetrics re-fetches when metrics:invalidate fires', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')

    render(<OverviewMetrics projectId={1} />)

    // Wait for initial fetch
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/projects/1/overview-metrics')
    })

    const initialCallCount = fetchSpy.mock.calls.length

    // Fire the custom event
    window.dispatchEvent(new CustomEvent('metrics:invalidate'))

    // This will FAIL because OverviewMetrics doesn't listen to this event yet
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(initialCallCount + 1)
    })
  })

  it('HealthDashboard re-fetches when metrics:invalidate fires', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')

    render(<HealthDashboard projectId={1} />)

    // Wait for initial fetch
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/projects/1/overview-metrics')
    })

    const initialCallCount = fetchSpy.mock.calls.length

    // Fire the custom event
    window.dispatchEvent(new CustomEvent('metrics:invalidate'))

    // This will FAIL because HealthDashboard doesn't listen to this event yet
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(initialCallCount + 1)
    })
  })
})
