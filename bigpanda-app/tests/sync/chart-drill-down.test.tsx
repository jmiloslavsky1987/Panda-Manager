// @vitest-environment jsdom
// tests/sync/chart-drill-down.test.tsx
// RED tests for SYNC-02 — pie chart onClick navigation with severity filter
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OverviewMetrics } from '@/components/OverviewMetrics'
import { RisksTableClient } from '@/components/RisksTableClient'

// Mock next/navigation
const mockPush = vi.fn()
const mockSearchParams = new Map<string, string | null>()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) ?? null,
  }),
}))

describe('SYNC-02: pie chart drill-down with severity filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams.clear()
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          stepCounts: [],
          riskCounts: [
            { severity: 'critical', count: 2 },
            { severity: 'high', count: 5 },
            { severity: 'medium', count: 3 },
          ],
          integrationCounts: [],
          milestoneOnTrack: [],
          weeklyRollup: [],
          weeklyTarget: null,
          totalHoursThisWeek: 0,
        }),
      } as Response)
    )
  })

  it('OverviewMetrics pie chart segment has cursor pointer style', async () => {
    render(<OverviewMetrics projectId={1} />)

    await waitFor(() => {
      expect(screen.getByTestId('overview-metrics')).toBeDefined()
    })

    // This will FAIL because pie chart segments don't have cursor:pointer or onClick yet
    // We need to find the recharts Pie component and check if it has cursor:pointer style
    // For now, we just assert the expectation
    const pieChart = document.querySelector('.recharts-pie')
    expect(pieChart).toBeDefined()
    // This will fail - no pointer cursor set yet
    expect(pieChart).toHaveStyle({ cursor: 'pointer' })
  })

  it('Clicking a risk severity segment calls router.push with severity filter', async () => {
    const user = userEvent.setup()

    render(<OverviewMetrics projectId={1} />)

    await waitFor(() => {
      expect(screen.getByTestId('overview-metrics')).toBeDefined()
    })

    // This will FAIL because onClick is not implemented yet
    // Find a pie segment (recharts renders them as path elements)
    const pieSegments = document.querySelectorAll('.recharts-pie-sector')
    expect(pieSegments.length).toBeGreaterThan(0)

    // Click the first segment (should be critical)
    await user.click(pieSegments[0] as Element)

    // Expected: router.push called with severity filter URL
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('/customer/1/risks')
    )
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('severity=')
    )
  })

  it('RisksTableClient filters by severity param from URL', async () => {
    mockSearchParams.set('severity', 'high')

    const mockRisks = [
      {
        id: 1,
        external_id: 'RISK-001',
        description: 'Critical risk',
        severity: 'critical',
        status: 'open',
        owner: 'Alice',
        mitigation: null,
        source: 'manual',
        source_artifact_id: null,
        discovery_source: null,
        project_id: 1,
        created_at: '2026-04-01',
        updated_at: '2026-04-01',
      },
      {
        id: 2,
        external_id: 'RISK-002',
        description: 'High risk',
        severity: 'high',
        status: 'open',
        owner: 'Bob',
        mitigation: null,
        source: 'manual',
        source_artifact_id: null,
        discovery_source: null,
        project_id: 1,
        created_at: '2026-04-01',
        updated_at: '2026-04-01',
      },
      {
        id: 3,
        external_id: 'RISK-003',
        description: 'Another high risk',
        severity: 'high',
        status: 'open',
        owner: 'Charlie',
        mitigation: null,
        source: 'manual',
        source_artifact_id: null,
        discovery_source: null,
        project_id: 1,
        created_at: '2026-04-01',
        updated_at: '2026-04-01',
      },
    ]

    render(<RisksTableClient risks={mockRisks} artifacts={[]} projectId={1} />)

    // This will FAIL because RisksTableClient doesn't filter by severity param yet
    // Only high severity risks should be shown
    expect(screen.queryByText('RISK-001')).toBeNull()
    expect(screen.getByText('RISK-002')).toBeDefined()
    expect(screen.getByText('RISK-003')).toBeDefined()
  })
})
