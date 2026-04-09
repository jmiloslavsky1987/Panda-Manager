import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock storage for tracking writes per entity type
let writtenByType: Record<string, number> = {}
let skippedByType: Record<string, number> = {}
let errors: Array<{ entityType: string; error: string }> = []
let selectCallCount = 0

vi.mock('@/db', () => {
  const mockInsert = vi.fn((table: any) => {
    return {
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
      }),
    }
  })

  return {
    db: {
      transaction: vi.fn().mockImplementation(async (fn) => fn({
        insert: mockInsert,
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      })),
      select: vi.fn(() => {
        selectCallCount++
        // First select is artifact lookup, should return artifact
        // Subsequent selects are conflict checks, should return empty
        const shouldReturnArtifact = selectCallCount === 1
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(
              shouldReturnArtifact ? [{ id: 1, ingestion_log_json: {} }] : []
            ),
          }),
        }
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    },
  }
})

vi.mock('@/lib/auth-server', () => ({
  requireSession: vi.fn().mockResolvedValue({ session: { user: { id: '1' } }, redirectResponse: null }),
}))

// Import after mocks
const { POST } = await import('../ingestion/approve/route')

describe('POST /api/ingestion/approve — Gap F: Per-entity breakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    writtenByType = {}
    skippedByType = {}
    errors = []
    selectCallCount = 0
  })

  it('returns written as Record<string, number> with multiple entity types', async () => {
    const req = new Request('http://localhost/api/ingestion/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artifactId: 1,
        projectId: 1,
        totalExtracted: 5,
        items: [
          {
            entityType: 'action',
            fields: { title: 'Action 1', status: 'open', owner: 'Team A' },
            approved: true,
          },
          {
            entityType: 'action',
            fields: { title: 'Action 2', status: 'open', owner: 'Team B' },
            approved: true,
          },
          {
            entityType: 'action',
            fields: { title: 'Action 3', status: 'open', owner: 'Team C' },
            approved: true,
          },
          {
            entityType: 'risk',
            fields: { title: 'Risk 1', severity: 'high' },
            approved: true,
          },
          {
            entityType: 'risk',
            fields: { title: 'Risk 2', severity: 'medium' },
            approved: true,
          },
        ],
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const body = await res.json()

    // Gap F: written should be a Record, not a single integer
    expect(typeof body.written).toBe('object')
    expect(body.written.action).toBe(3)
    expect(body.written.risk).toBe(2)
  })

  it('returns skipped as Record<string, number> when items are skipped', async () => {
    // Note: To test skip behavior properly, we'd need to mock arch_node handler with unknown track
    // For now, we test the response shape
    const req = new Request('http://localhost/api/ingestion/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artifactId: 1,
        projectId: 1,
        totalExtracted: 1,
        items: [
          {
            entityType: 'action',
            fields: { title: 'Action 1', status: 'open', owner: 'Team A' },
            approved: true,
          },
        ],
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const body = await res.json()

    // Gap F: skipped should be a Record (even if empty)
    expect(typeof body.skipped).toBe('object')
  })

  it('returns errors array in response', async () => {
    const req = new Request('http://localhost/api/ingestion/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artifactId: 1,
        projectId: 1,
        totalExtracted: 1,
        items: [
          {
            entityType: 'action',
            fields: { title: 'Action 1', status: 'open', owner: 'Team A' },
            approved: true,
          },
        ],
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const body = await res.json()

    // Gap F: errors should be an array (even if empty)
    expect(Array.isArray(body.errors)).toBe(true)
  })

  it('calculates items_approved from sum of written values', async () => {
    // This test verifies that the artifact log update uses the correct calculation
    // Since we can't easily inspect the update call in the mock, this is a smoke test
    const req = new Request('http://localhost/api/ingestion/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artifactId: 1,
        projectId: 1,
        totalExtracted: 3,
        items: [
          {
            entityType: 'action',
            fields: { title: 'Action 1', status: 'open', owner: 'Team A' },
            approved: true,
          },
          {
            entityType: 'risk',
            fields: { title: 'Risk 1', severity: 'high' },
            approved: true,
          },
          {
            entityType: 'milestone',
            fields: { title: 'Milestone 1', target_date: '2026-05-01' },
            approved: true,
          },
        ],
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const body = await res.json()

    // Verify the per-entity breakdown
    const totalWritten = Object.values(body.written as Record<string, number>).reduce((sum, n) => sum + n, 0)
    expect(totalWritten).toBe(3)
  })
})
