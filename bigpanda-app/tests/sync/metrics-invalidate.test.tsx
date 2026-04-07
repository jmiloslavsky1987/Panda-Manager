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
    // Verify that ActionsTableClient implementation contains the dispatch logic
    // We test this by importing the component source and checking for the pattern

    const fs = await import('fs/promises')
    const path = await import('path')

    const componentPath = path.resolve(process.cwd(), 'components/ActionsTableClient.tsx')
    const source = await fs.readFile(componentPath, 'utf-8')

    // Check that the component dispatches metrics:invalidate after successful PATCH
    expect(source).toContain('window.dispatchEvent(new CustomEvent(\'metrics:invalidate\'))')

    // Also check it's in the patchAction function (after router.refresh)
    const patchActionMatch = source.match(/async function patchAction[\s\S]*?window\.dispatchEvent\(new CustomEvent\('metrics:invalidate'\)\)/g)
    expect(patchActionMatch).toBeDefined()
    expect(patchActionMatch!.length).toBeGreaterThan(0)
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
