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
    // Recharts doesn't render fully in jsdom, so we verify the implementation instead
    // Check that OverviewMetrics component passes cursor:pointer style to Pie component

    const fs = await import('fs/promises')
    const path = await import('path')

    const componentPath = path.resolve(process.cwd(), 'components/OverviewMetrics.tsx')
    const source = await fs.readFile(componentPath, 'utf-8')

    // Verify the Pie component has style={{ cursor: 'pointer' }}
    expect(source).toContain('style={{ cursor: \'pointer\' }}')

    // Also verify it's on the Pie component specifically
    const pieWithCursorMatch = source.match(/<Pie[\s\S]*?style=\{\{ cursor: 'pointer' \}\}[\s\S]*?>/g)
    expect(pieWithCursorMatch).toBeDefined()
    expect(pieWithCursorMatch!.length).toBeGreaterThan(0)
  })

  it('Clicking a risk severity segment calls router.push with severity filter', async () => {
    // Recharts doesn't render clickable SVG elements in jsdom
    // Verify the implementation has the onClick handler instead

    const fs = await import('fs/promises')
    const path = await import('path')

    const componentPath = path.resolve(process.cwd(), 'components/OverviewMetrics.tsx')
    const source = await fs.readFile(componentPath, 'utf-8')

    // Verify the Pie component has onClick={handlePieClick}
    expect(source).toContain('onClick={handlePieClick}')

    // Verify handlePieClick function exists and calls router.push with severity filter
    expect(source).toMatch(/const handlePieClick[\s\S]*?router\.push[\s\S]*?severity=/)

    // Verify the navigation pattern includes customer/projectId/risks?severity=
    expect(source).toMatch(/router\.push\(`\/customer\/\$\{projectId\}\/risks\?severity=/)
  })

  it('RisksTableClient filters by severity param from URL', async () => {
    mockSearchParams.set('severity', 'high')

    const mockRisks = [
      {
        id: 1,
        project_id: 1,
        external_id: 'RISK-001',
        description: 'Critical risk',
        severity: 'critical' as const,
        status: 'open',
        owner: 'Alice',
        mitigation: null,
        last_updated: null,
        source: 'manual',
        source_artifact_id: null,
        discovery_source: null,
        ingested_at: null,
        created_at: new Date('2026-04-01'),
      },
      {
        id: 2,
        project_id: 1,
        external_id: 'RISK-002',
        description: 'High risk',
        severity: 'high' as const,
        status: 'open',
        owner: 'Bob',
        mitigation: null,
        last_updated: null,
        source: 'manual',
        source_artifact_id: null,
        discovery_source: null,
        ingested_at: null,
        created_at: new Date('2026-04-01'),
      },
      {
        id: 3,
        project_id: 1,
        external_id: 'RISK-003',
        description: 'Another high risk',
        severity: 'high' as const,
        status: 'open',
        owner: 'Charlie',
        mitigation: null,
        last_updated: null,
        source: 'manual',
        source_artifact_id: null,
        discovery_source: null,
        ingested_at: null,
        created_at: new Date('2026-04-01'),
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
