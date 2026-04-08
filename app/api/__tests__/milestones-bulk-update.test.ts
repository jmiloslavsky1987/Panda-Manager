import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/db', () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}))
vi.mock('@/lib/auth-server', () => ({
  requireSession: vi.fn().mockResolvedValue({ session: { user: { id: '1' } }, redirectResponse: null }),
}))

// Import after mocks
const { POST } = await import('../milestones/bulk-update/route')

describe('POST /api/milestones/bulk-update', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 with ok:true when valid milestone_ids and status provided', async () => {
    const req = new Request('http://localhost/api/milestones/bulk-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestone_ids: [1, 2], patch: { status: 'completed' } }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.count).toBe(2)
  })

  it('returns 400 when milestone_ids is empty', async () => {
    const req = new Request('http://localhost/api/milestones/bulk-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestone_ids: [], patch: { status: 'blocked' } }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when no fields to update in patch', async () => {
    const req = new Request('http://localhost/api/milestones/bulk-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestone_ids: [1], patch: {} }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })
})
