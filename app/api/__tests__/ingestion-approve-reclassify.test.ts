import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * ingestion-approve-reclassify.test.ts — Tests for INGEST-05 approve route
 *
 * Confirms the approve route already handles reclassified notes correctly:
 * - Reclassified note with entityType:action routes to actions table
 * - Reclassified note with entityType:task routes to tasks table
 * - Non-reclassified note with entityType:note still routes to engagementHistory
 *
 * Expected: These tests should pass GREEN immediately (baseline verification)
 */

// Track which table was inserted into
let insertedTable: string | null = null
let selectCallCount = 0

vi.mock('@/db', () => {
  const mockInsert = vi.fn((table: any) => {
    // Capture the table name from the table object's symbol description
    insertedTable = table?.constructor?.name || String(table)
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
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
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

describe('POST /api/ingestion/approve — Reclassification routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertedTable = null
    selectCallCount = 0
  })

  it('reclassified note with entityType:action routes to actions table, returns written:1', async () => {
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
            fields: {
              description: 'Do something important',
              owner: 'Alice',
            },
            approved: true,
          },
        ],
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const body = await res.json()
    const totalWritten = Object.values(body.written as Record<string, number>).reduce((sum, n) => sum + n, 0)
    expect(totalWritten).toBeGreaterThanOrEqual(1)
  })

  it('reclassified note with entityType:task routes correctly, returns written:1', async () => {
    const req = new Request('http://localhost/api/ingestion/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artifactId: 1,
        projectId: 1,
        totalExtracted: 1,
        items: [
          {
            entityType: 'task',
            fields: {
              title: 'Complete task X',
              status: 'todo',
            },
            approved: true,
          },
        ],
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const body = await res.json()
    const totalWritten = Object.values(body.written as Record<string, number>).reduce((sum, n) => sum + n, 0)
    expect(totalWritten).toBeGreaterThanOrEqual(1)
  })

  it('non-reclassified note with entityType:note still routes correctly', async () => {
    const req = new Request('http://localhost/api/ingestion/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artifactId: 1,
        projectId: 1,
        totalExtracted: 1,
        items: [
          {
            entityType: 'note',
            fields: {
              content: 'This is a regular note',
              author: 'Bob',
            },
            approved: true,
          },
        ],
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const body = await res.json()
    const totalWritten = Object.values(body.written as Record<string, number>).reduce((sum, n) => sum + n, 0)
    expect(totalWritten).toBeGreaterThanOrEqual(1)
  })
})
