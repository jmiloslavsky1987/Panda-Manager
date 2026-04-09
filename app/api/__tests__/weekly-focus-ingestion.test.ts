import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRedisSet = vi.fn().mockResolvedValue('OK')
const mockRedisQuit = vi.fn().mockResolvedValue(undefined)
const mockRedisConnect = vi.fn().mockResolvedValue(undefined)

vi.mock('@/worker/connection', () => ({
  createApiRedisConnection: vi.fn(() => ({
    connect: mockRedisConnect,
    set: mockRedisSet,
    quit: mockRedisQuit,
  })),
}))

vi.mock('@/db', () => {
  return {
    db: {
      transaction: vi.fn().mockImplementation(async (fn) => fn({
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 1 }]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      })),
      select: vi.fn(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 1, ingestion_log_json: {} }]),
        }),
      })),
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

describe('POST /api/ingestion/approve — Gap G: weekly_focus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('weekly_focus entity returns 200 with written=1', async () => {
    const req = new Request('http://localhost/api/ingestion/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artifactId: 1,
        projectId: 1,
        totalExtracted: 1,
        items: [
          {
            entityType: 'weekly_focus',
            fields: {
              bullets: ['Focus item 1', 'Focus item 2', 'Focus item 3'],
            },
            approved: true,
          },
        ],
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const body = await res.json()
    // This will FAIL because 'weekly_focus' is not in the Zod enum → filtered out → written=0
    expect(body.written).toBe(1)
  })

  it('weekly_focus handler writes bullets to Redis with correct key', async () => {
    const req = new Request('http://localhost/api/ingestion/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artifactId: 1,
        projectId: 1,
        totalExtracted: 1,
        items: [
          {
            entityType: 'weekly_focus',
            fields: {
              bullets: ['Focus item 1', 'Focus item 2'],
            },
            approved: true,
          },
        ],
      }),
    })

    await POST(req as any)

    // This will FAIL because weekly_focus handler doesn't exist yet
    expect(mockRedisSet).toHaveBeenCalledWith(
      'weekly_focus:1',
      JSON.stringify(['Focus item 1', 'Focus item 2']),
      'EX',
      7 * 24 * 60 * 60
    )
  })

  it('weekly_focus with comma-separated bullets string parses correctly', async () => {
    const req = new Request('http://localhost/api/ingestion/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artifactId: 1,
        projectId: 1,
        totalExtracted: 1,
        items: [
          {
            entityType: 'weekly_focus',
            fields: {
              bullets: 'Item 1, Item 2, Item 3',
            },
            approved: true,
          },
        ],
      }),
    })

    await POST(req as any)

    // This will FAIL because weekly_focus handler doesn't exist yet
    // Should parse comma-separated string into array
    expect(mockRedisSet).toHaveBeenCalledWith(
      'weekly_focus:1',
      JSON.stringify(['Item 1', 'Item 2', 'Item 3']),
      'EX',
      7 * 24 * 60 * 60
    )
  })
})
