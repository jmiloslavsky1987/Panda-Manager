// tests/api/ingestion-approve-new-entity-types-integration.test.ts
// Phase 88.1 G5 — IMPORTANT 6: Integration test — synthetic POST to approve route
// Approach: vi.mock the per-entity applier fns + DB + auth + Redis connection.
// Asserts each mocked applier fn is invoked when a synthetic ApprovalItem of each
// new entityType is submitted. RED before Task 3 (Zod enum + case branches not yet
// added); GREEN after Task 3.
//
// NOTE: The approve route makes an artifact DB lookup and other queries. We mock
// @/db with a minimal chainable builder that returns an artifact row for the
// artifact-lookup query and empty arrays otherwise. The applier fns are mocked at
// module level so their invocation can be asserted independently.

import { describe, expect, it, vi, beforeEach } from 'vitest'

// ── Mock: per-entity applier fns ──────────────────────────────────────────────
// Must be hoisted before any dynamic import of the route module.
vi.mock('@/lib/context-updater-applier', async (orig) => {
  const actual = await (orig as () => Promise<Record<string, unknown>>)()
  return {
    ...actual,
    applyEvidenceLogEntry: vi.fn(async () => ({ inserted: true })),
    applyTeamCardActivity: vi.fn(async () => ({ updated: true, team_card_id: 1 })),
    applyTeamMetricCurrent: vi.fn(async () => ({ updated: true, metric_id: 1 })),
    applyMilestoneDate: vi.fn(async () => ({ updated: true, milestone_id: 1 })),
  }
})

// ── Mock: requireProjectRole — skip auth in tests ────────────────────────────
vi.mock('@/lib/auth-server', () => ({
  requireProjectRole: vi.fn(async () => ({
    redirectResponse: null,
    session: { user: { id: 'test-user' } },
    role: 'admin',
  })),
}))

// ── Mock: DB — chainable builder that satisfies artifact lookup ───────────────
// The approve route calls db.select().from(artifacts).where(eq(artifacts.id, artifactId))
// We return a minimal artifact row with id=1 and empty ingestion_log_json to pass validation.
vi.mock('@/db', () => {
  const artifactRow = { id: 1, ingestion_log_json: {} }

  const makeChain = (resolveValue: unknown[] = []) => {
    const chain: Record<string, unknown> = {}
    chain.from = vi.fn(() => chain)
    chain.where = vi.fn(() => chain)
    chain.limit = vi.fn(() => chain)
    chain.orderBy = vi.fn(() => chain)
    chain.set = vi.fn(() => chain)
    chain.values = vi.fn(() => chain)
    chain.returning = vi.fn(async () => resolveValue)
    // Make the chain itself thenable so await db.select()... resolves
    chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolveValue).then(resolve)
    return chain
  }

  const selectFn = vi.fn(() => makeChain([artifactRow]))
  const insertFn = vi.fn(() => makeChain([{ id: 99 }]))
  const updateFn = vi.fn(() => makeChain([]))

  return {
    default: {
      select: selectFn,
      insert: insertFn,
      update: updateFn,
      transaction: vi.fn(async (fn: (tx: unknown) => unknown) => {
        const txChain = makeChain([{ id: 99 }])
        const tx = {
          select: vi.fn(() => makeChain([artifactRow])),
          insert: vi.fn(() => txChain),
          update: vi.fn(() => txChain),
          execute: vi.fn(async () => undefined),
        }
        return fn(tx)
      }),
    },
    db: {
      select: selectFn,
      insert: insertFn,
      update: updateFn,
      transaction: vi.fn(async (fn: (tx: unknown) => unknown) => {
        const txChain = makeChain([{ id: 99 }])
        const tx = {
          select: vi.fn(() => makeChain([artifactRow])),
          insert: vi.fn(() => txChain),
          update: vi.fn(() => txChain),
          execute: vi.fn(async () => undefined),
        }
        return fn(tx)
      }),
    },
  }
})

// ── Mock: Redis connection (used by weekly_focus case) ────────────────────────
vi.mock('@/worker/connection', () => ({
  createApiRedisConnection: vi.fn(() => ({
    connect: vi.fn(async () => undefined),
    set: vi.fn(async () => undefined),
    quit: vi.fn(async () => undefined),
  })),
}))

// ── Mock: coercers (side-effect-free helpers) ─────────────────────────────────
vi.mock('@/app/api/ingestion/approve/coercers', () => ({
  coerceWbsItemStatus: vi.fn((s: string) => s ?? 'not_started'),
  coerceArchNodeStatus: vi.fn((s: string) => s ?? 'planned'),
}))

// ── Dynamic route import (AFTER all mocks are set up) ─────────────────────────
async function importRoute() {
  return await import('@/app/api/ingestion/approve/route')
}

function makeRequest(items: Array<Record<string, unknown>>): Request {
  return new Request('http://localhost/api/ingestion/approve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      artifactId: 1,
      projectId: 1,
      items,
      totalExtracted: items.length,
    }),
  })
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 88.1 G5 — integration: approve route dispatches to per-entity appliers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Test I: POST with evidence_log_entry item → applyEvidenceLogEntry invoked', async () => {
    const { POST } = await importRoute()
    const applier = await import('@/lib/context-updater-applier')
    const req = makeRequest([{
      entityType: 'evidence_log_entry',
      fields: { business_outcome_id: 5, date: '2026-05-15', text: 'MTTR dropped to 1.5hrs' },
      approved: true,
    }])
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(res.status).toBeLessThan(500)
    expect(applier.applyEvidenceLogEntry).toHaveBeenCalledTimes(1)
  })

  it('Test J: POST with team_card_activity item → applyTeamCardActivity invoked', async () => {
    const { POST } = await importRoute()
    const applier = await import('@/lib/context-updater-applier')
    const req = makeRequest([{
      entityType: 'team_card_activity',
      fields: { team_name: 'Change Risk Ops', latest_activity: 'Data source integration complete' },
      approved: true,
    }])
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(res.status).toBeLessThan(500)
    expect(applier.applyTeamCardActivity).toHaveBeenCalledTimes(1)
  })

  it('Test K: POST with team_metric_current item → applyTeamMetricCurrent invoked', async () => {
    const { POST } = await importRoute()
    const applier = await import('@/lib/context-updater-applier')
    const req = makeRequest([{
      entityType: 'team_metric_current',
      fields: { team_card_id: 1, label: 'Risk Categories Live', current: '3 / 5' },
      approved: true,
    }])
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(res.status).toBeLessThan(500)
    expect(applier.applyTeamMetricCurrent).toHaveBeenCalledTimes(1)
  })

  it('Test L: POST with milestone_date_update item → applyMilestoneDate invoked', async () => {
    const { POST } = await importRoute()
    const applier = await import('@/lib/context-updater-applier')
    const req = makeRequest([{
      entityType: 'milestone_date_update',
      fields: { milestone_id: 1, target_date: '2026-08-15' },
      approved: true,
    }])
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(res.status).toBeLessThan(500)
    expect(applier.applyMilestoneDate).toHaveBeenCalledTimes(1)
  })

  it('Test M (BLOCKER 1 catch): POST with unenumerated entityType → silently filtered (no applier called)', async () => {
    // Validates the Zod gate: items with entityTypes not in the z.enum are silently filtered
    // before reaching the switch dispatch. All 4 new-entity appliers must NOT be called.
    const { POST } = await importRoute()
    const applier = await import('@/lib/context-updater-applier')
    const req = makeRequest([{
      entityType: 'totally_nonexistent_type',
      fields: { foo: 'bar' },
      approved: true,
    }])
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(res.status).toBeLessThan(500)
    // Unenumerated types must not reach any applier
    expect(applier.applyEvidenceLogEntry).not.toHaveBeenCalled()
    expect(applier.applyTeamCardActivity).not.toHaveBeenCalled()
    expect(applier.applyTeamMetricCurrent).not.toHaveBeenCalled()
    expect(applier.applyMilestoneDate).not.toHaveBeenCalled()
  })
})
