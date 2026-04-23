import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockTransaction = vi.fn()

vi.mock('@/db', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    transaction: mockTransaction,
  },
}))

const mockRequireSession = vi.fn()
const mockRequireProjectRole = vi.fn()

vi.mock('@/lib/auth-server', () => ({
  requireSession: mockRequireSession,
  requireProjectRole: mockRequireProjectRole,
}))

// Import after mocks
const { POST } = await import('../tasks-bulk/route')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/tasks-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/tasks-bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated session
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '42' } },
      redirectResponse: null,
    })

    // Default: authorized project member
    mockRequireProjectRole.mockResolvedValue({
      session: { user: { id: '42' } },
      redirectResponse: null,
    })

    // Default: task lookup returns a task with project_id 1
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ project_id: 1 }]),
      }),
    })

    // Default: transaction runs callback
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        execute: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }
      return cb(tx)
    })
  })

  // ─── Success ───────────────────────────────────────────────────────────────

  it('returns 200 with ok:true when user belongs to the project', async () => {
    const req = makeRequest({ task_ids: [1, 2], patch: { status: 'done' } })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.count).toBe(2)
  })

  it('calls requireProjectRole with the first task project_id before updating', async () => {
    const req = makeRequest({ task_ids: [7], patch: { owner: 'Alice' } })
    await POST(req as any)
    expect(mockRequireProjectRole).toHaveBeenCalledWith(1, 'user')
  })

  it('runs update inside a transaction with SET LOCAL RLS variable', async () => {
    const txExecuteMock = vi.fn().mockResolvedValue(undefined)
    const txUpdateWhere = vi.fn().mockResolvedValue([])
    const txUpdateSet = vi.fn().mockReturnValue({ where: txUpdateWhere })
    const txUpdate = vi.fn().mockReturnValue({ set: txUpdateSet })

    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb({ execute: txExecuteMock, update: txUpdate })
    })

    const req = makeRequest({ task_ids: [3], patch: { due: '2026-06-01' } })
    await POST(req as any)

    expect(txExecuteMock).toHaveBeenCalledOnce()
    // SET LOCAL call should include the project_id (1)
    const setLocalArg = txExecuteMock.mock.calls[0][0]
    expect(String(setLocalArg)).toContain('1')

    expect(txUpdate).toHaveBeenCalledOnce()
  })

  // ─── Authorization failure ─────────────────────────────────────────────────

  it('returns 403 when user is NOT a member of the task project', async () => {
    const forbiddenResponse = new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
    })
    mockRequireProjectRole.mockResolvedValue({
      session: null,
      redirectResponse: forbiddenResponse,
    })

    const req = makeRequest({ task_ids: [99], patch: { status: 'blocked' } })
    const res = await POST(req as any)
    expect(res.status).toBe(403)
  })

  it('does NOT call db.transaction when requireProjectRole returns a redirect', async () => {
    const forbiddenResponse = new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
    })
    mockRequireProjectRole.mockResolvedValue({
      session: null,
      redirectResponse: forbiddenResponse,
    })

    const req = makeRequest({ task_ids: [99], patch: { status: 'blocked' } })
    await POST(req as any)

    expect(mockTransaction).not.toHaveBeenCalled()
  })

  // ─── Task not found ────────────────────────────────────────────────────────

  it('returns 404 when the task_id does not exist', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]), // empty — task not found
      }),
    })

    const req = makeRequest({ task_ids: [9999], patch: { status: 'in-progress' } })
    const res = await POST(req as any)
    expect(res.status).toBe(404)
  })

  // ─── Validation ────────────────────────────────────────────────────────────

  it('returns 422 when task_ids is empty', async () => {
    const req = makeRequest({ task_ids: [], patch: { status: 'done' } })
    const res = await POST(req as any)
    expect(res.status).toBe(422)
  })

  it('returns 400 when patch has no fields', async () => {
    const req = makeRequest({ task_ids: [1], patch: {} })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is not valid JSON schema', async () => {
    const req = new Request('http://localhost/api/tasks-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  // ─── Session gate ──────────────────────────────────────────────────────────

  it('returns 401 redirect when not authenticated', async () => {
    const unauthResponse = new Response(null, { status: 401 })
    mockRequireSession.mockResolvedValue({
      session: null,
      redirectResponse: unauthResponse,
    })

    const req = makeRequest({ task_ids: [1], patch: { status: 'done' } })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })
})
