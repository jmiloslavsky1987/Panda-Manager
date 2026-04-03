// tests/api/overview-metrics.test.ts
// Wave 0 RED stubs for Phase 34: overview-metrics API (METR-01)
import { describe, it, expect } from 'vitest'

describe('GET /api/projects/[projectId]/overview-metrics — aggregation', () => {
  it('returns stepCounts grouped by track and status', () => {
    const handler: any = undefined
    expect(handler).toBeDefined()
  })
  it('returns riskCounts grouped by severity', () => {
    const handler: any = undefined
    expect(handler).toBeDefined()
  })
  it('returns integrationCounts grouped by status', () => {
    const handler: any = undefined
    expect(handler).toBeDefined()
  })
  it('returns milestoneOnTrack counts grouped by status', () => {
    const handler: any = undefined
    expect(handler).toBeDefined()
  })
  it('returns 400 for non-numeric projectId', () => {
    const handler: any = undefined
    expect(handler).toBeDefined()
  })
})
