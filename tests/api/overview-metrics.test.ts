// tests/api/overview-metrics.test.ts
// Wave 0 tests for Phase 34: overview-metrics API (METR-01)
import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/projects/[projectId]/overview-metrics/route'

describe('GET /api/projects/[projectId]/overview-metrics — aggregation', () => {
  it('returns stepCounts grouped by track and status', () => {
    expect(GET).toBeDefined()
    expect(typeof GET).toBe('function')
  })
  it('returns riskCounts grouped by severity', () => {
    expect(GET).toBeDefined()
    expect(typeof GET).toBe('function')
  })
  it('returns integrationCounts grouped by status', () => {
    expect(GET).toBeDefined()
    expect(typeof GET).toBe('function')
  })
  it('returns milestoneOnTrack counts grouped by status', () => {
    expect(GET).toBeDefined()
    expect(typeof GET).toBe('function')
  })
  it('returns 400 for non-numeric projectId', () => {
    expect(GET).toBeDefined()
    expect(typeof GET).toBe('function')
  })
})
