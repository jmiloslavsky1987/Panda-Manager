// @vitest-environment jsdom
// tests/ui/loading-skeletons.test.tsx
// RED tests for UXPOL-03 — Loading skeleton states
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { OverviewMetrics } from '../../components/OverviewMetrics'
import { HealthDashboard } from '../../components/HealthDashboard'
import { SkillsTabClient } from '../../components/SkillsTabClient'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new Map(),
}))

describe('UXPOL-03 — Loading Skeletons', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (fetchSpy) {
      fetchSpy.mockRestore()
    }
  })

  it('OverviewMetrics shows 3-card skeleton grid when loading', async () => {
    // Mock fetch to never resolve
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}))

    const { container } = render(<OverviewMetrics projectId={123} />)

    // Expect 3 elements with animate-pulse (not just 1)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThanOrEqual(3)
  })

  it('HealthDashboard shows expanded skeleton when loading', async () => {
    // Mock fetch to never resolve
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}))

    const { container } = render(<HealthDashboard projectId={123} />)

    // Expect animate-pulse element(s) present
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it.skip('SkillsTabClient shows skeleton during initial mount', async () => {
    // Mock fetch to delay so loading state is testable
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}))

    const { container } = render(<SkillsTabClient projectId={123} recentRuns={[]} />)

    // Expect animate-pulse element visible before fetch resolves
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
