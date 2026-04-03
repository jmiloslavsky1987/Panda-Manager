// tests/overview/metrics-health.test.ts
// Wave 0 RED stubs for Phase 34: METR-01, HLTH-01, TMLN-01
import { describe, it, expect } from 'vitest'

describe('OverviewMetrics — METR-01', () => {
  it('renders onboarding progress rings for ADR and Biggy tracks', async () => {
    const { OverviewMetrics } = await import('../../components/OverviewMetrics')
    expect(OverviewMetrics).toBeDefined()
    // Component exists with ProgressRing
    const source = await import('../../components/OverviewMetrics')
    expect(source).toBeDefined()
  })
  it('renders risk distribution donut chart', async () => {
    const { OverviewMetrics } = await import('../../components/OverviewMetrics')
    expect(OverviewMetrics).toBeDefined()
    // PieChart with innerRadius/outerRadius for donut
  })
  it('renders weekly hours bar chart', async () => {
    const { OverviewMetrics } = await import('../../components/OverviewMetrics')
    expect(OverviewMetrics).toBeDefined()
    // BarChart with weeklyRollup data
  })
})

describe('HealthDashboard — HLTH-01', () => {
  it('renders overall health RAG badge with data-testid="overall-health-badge"', async () => {
    const { HealthDashboard } = await import('../../components/HealthDashboard')
    expect(HealthDashboard).toBeDefined()
    // Component should have overall-health-badge data-testid
  })
  it('renders ADR and Biggy per-track health badges', async () => {
    const { HealthDashboard } = await import('../../components/HealthDashboard')
    expect(HealthDashboard).toBeDefined()
    // Component should have adr-health-badge and biggy-health-badge data-testid
  })
  it('renders active blocker count', async () => {
    const { HealthDashboard } = await import('../../components/HealthDashboard')
    expect(HealthDashboard).toBeDefined()
    // Component should calculate and display sum of blocked steps
  })
})

describe('computeOverallHealth — health-formula', () => {
  it('returns red when openCriticalRisks > 0', async () => {
    const { computeOverallHealth } = await import('../../components/HealthDashboard')
    expect(computeOverallHealth).toBeDefined()
    const result = computeOverallHealth({
      openCriticalRisks: 1,
      openHighRisks: 0,
      adrCompletion: 80,
      biggyCompletion: 70,
    })
    expect(result).toBe('red')
  })
  it('returns yellow when openHighRisks > 0', async () => {
    const { computeOverallHealth } = await import('../../components/HealthDashboard')
    const result = computeOverallHealth({
      openCriticalRisks: 0,
      openHighRisks: 1,
      adrCompletion: 80,
      biggyCompletion: 70,
    })
    expect(result).toBe('yellow')
  })
  it('returns yellow when adrCompletion < 50', async () => {
    const { computeOverallHealth } = await import('../../components/HealthDashboard')
    const result = computeOverallHealth({
      openCriticalRisks: 0,
      openHighRisks: 0,
      adrCompletion: 40,
      biggyCompletion: 70,
    })
    expect(result).toBe('yellow')
  })
  it('returns yellow when biggyCompletion < 50', async () => {
    const { computeOverallHealth } = await import('../../components/HealthDashboard')
    const result = computeOverallHealth({
      openCriticalRisks: 0,
      openHighRisks: 0,
      adrCompletion: 80,
      biggyCompletion: 30,
    })
    expect(result).toBe('yellow')
  })
  it('returns green when no risks and both tracks >= 50%', async () => {
    const { computeOverallHealth } = await import('../../components/HealthDashboard')
    const result = computeOverallHealth({
      openCriticalRisks: 0,
      openHighRisks: 0,
      adrCompletion: 80,
      biggyCompletion: 70,
    })
    expect(result).toBe('green')
  })
})

describe('MilestoneTimeline — TMLN-01', () => {
  it('renders component with data-testid="milestone-timeline"', async () => {
    const { MilestoneTimeline } = await import('../../components/MilestoneTimeline')
    expect(MilestoneTimeline).toBeDefined()
  })
  it('is positioned above metrics section in Overview tab', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const sourcePath = resolve(__dirname, '../../components/OnboardingDashboard.tsx')
    const source = readFileSync(sourcePath, 'utf-8')

    // Verify MilestoneTimeline comes before risks section
    const milestoneIndex = source.indexOf('<MilestoneTimeline')
    const risksIndex = source.indexOf('data-testid="risks-section"')
    expect(milestoneIndex).toBeGreaterThan(0)
    expect(risksIndex).toBeGreaterThan(milestoneIndex)
  })
})
