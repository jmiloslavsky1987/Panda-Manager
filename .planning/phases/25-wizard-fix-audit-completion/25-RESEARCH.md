# Phase 25: Wizard Fix + Audit Completion - Research

**Researched:** 2026-03-30
**Domain:** Next.js App Router API routes, Drizzle ORM transactions, React client component lifecycle
**Confidence:** HIGH

## Summary

Phase 25 is a two-fix gap-closure phase with no new features, no schema changes, and no new UI surfaces. Both fixes are surgical and fully specified in CONTEXT.md. The codebase is already well-understood from prior phases.

**Fix 1 (WIZ-03):** A single filter condition on line 59 of `AiPreviewStep.tsx` blocks the SSE extraction loop from ever running. `CollateralUploadStep` sets every uploaded file to `status: 'done'` after successful upload, so the filter `f.artifactId && f.status !== 'done'` evaluates to zero files. Remove the `f.status !== 'done'` guard. The extraction loop inside `extractFileByIndex` already manages its own `localStatuses` state for tracking in-progress extraction — the initial filter's status check is redundant and wrong.

**Fix 2 (AUDIT-02):** The `lib/audit.ts` helper (`writeAuditLog`) already exists and its test suite (`tests/audit/audit-helper.test.ts`) is already written with 5 test cases covering create/update/delete patterns. The work is to call this helper from 9 route files that currently write entities without audit entries, wrapping each operation in a `db.transaction()`. Reference implementations exist in `app/api/artifacts/[id]/route.ts` (single-entity pattern) and `app/api/projects/[projectId]/e2e-workflows/[workflowId]/steps/[stepId]/route.ts` (both create and delete in one route).

**Primary recommendation:** Treat these as two independent tasks. Fix WIZ-03 first (one-line change, immediate E2E testability), then implement AUDIT-02 route-by-route with the existing `writeAuditLog` helper.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Fix location: `bigpanda-app/components/wizard/AiPreviewStep.tsx` line 59
- Fix: remove `f.status !== 'done'` from the filter — keep only `f.artifactId`
- Audit granularity: one `audit_log` row per entity written (not batch summary)
- Insert: `before_json: null`, `after_json: { entity fields }`
- Merge: `before_json` from the `findConflict()` SELECT already in the loop
- Delete (replace step 1): `before_json: { existing fields }`, `after_json: null`, then a separate insert audit entry
- Transaction strategy: wrap each entity write + audit insert in `db.transaction()`
- actor_id: always `'default'`
- Routes covered: ingestion/approve, discovery/approve, tasks/[id] (PATCH+DELETE), tasks (POST), stakeholders (POST), workstreams/[id] (PATCH), knowledge-base/[id] (PATCH+DELETE), knowledge-base (POST), plan-templates/[id] (DELETE), plan-templates (POST)

### Claude's Discretion

- Exact entity fields to capture in `after_json` for each entity type in bulk routes (use the full inserted/updated field set)
- How to handle `entity_id` for inserted rows — retrieve via `.returning()` or follow-up SELECT
- Error handling strategy if the before-state SELECT fails (proceed with `before_json: null` vs abort)

### Deferred Ideas (OUT OF SCOPE)

- Time-entry mutations (time-entries/[entryId], bulk, submit, approve/reject)
- Settings, scheduler config, and OAuth routes
- Discovery dismiss/dismiss-history routes
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WIZ-03 | Wizard collateral upload step triggers the ingestion pipeline for each uploaded file; AI preview step fires SSE extraction calls | Filter fix in AiPreviewStep.tsx line 59 — removing `f.status !== 'done'` unblocks the extraction useEffect |
| AUDIT-02 | All data modifications (create, update, delete) on workspace records are written to audit_log with actor, timestamp, entity, and before/after JSON values | `lib/audit.ts` helper already exists; `db.transaction()` pattern from artifacts and e2e-workflows routes is the reference; 9 route files need the pattern applied |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | Installed (project-wide) | DB access, transactions | Already used throughout; `db.transaction(tx => ...)` pattern established |
| Next.js App Router | 14.x | API route handlers | Project-wide; all routes are `app/api/...` |
| React hooks (useEffect, useRef) | 18.x | Client component lifecycle | `AiPreviewStep` is a 'use client' component |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/lib/audit` (internal) | current | `writeAuditLog()` helper | All AUDIT-02 route changes call this instead of inline `db.insert(auditLog)` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `writeAuditLog` helper | Inline `db.insert(auditLog)` | Helper already exists, already tested, consistent with DRY principle — use the helper |
| Per-entity transaction | Global transaction for all items | Bulk routes process items in a loop; per-item transaction means a single item failure doesn't roll back previously written items, which matches existing error tolerance in these routes |

## Architecture Patterns

### Pattern 1: Single-Entity Audit (Reference: artifacts/[id]/route.ts)

**What:** SELECT before-state, then wrap update + audit insert in `db.transaction()`
**When to use:** PATCH and DELETE on single-entity routes (tasks, stakeholders, workstreams, knowledge-base, plan-templates)

```typescript
// Source: bigpanda-app/app/api/artifacts/[id]/route.ts
const [before] = await db.select().from(artifacts).where(eq(artifacts.id, numericId))
if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

await db.transaction(async (tx) => {
  await tx.update(artifacts).set(patch).where(eq(artifacts.id, numericId))
  await tx.insert(auditLog).values({
    entity_type: 'artifact',
    entity_id: numericId,
    action: 'update',
    actor_id: 'default',
    before_json: before as Record<string, unknown>,
    after_json: { ...before, ...patch } as Record<string, unknown>,
  })
})
```

### Pattern 2: Create Audit (Reference: e2e-workflows steps route)

**What:** Insert entity, retrieve returned row ID, audit with `before_json: null` and `after_json` from returned row
**When to use:** POST routes (tasks, stakeholders, knowledge-base, plan-templates)

```typescript
// Pattern — using .returning() to get entity_id for audit entry
const [newRow] = await db.insert(table).values({...}).returning()
await writeAuditLog({
  entityType: 'task',
  entityId: newRow.id,
  action: 'create',
  actorId: 'default',
  beforeJson: null,
  afterJson: newRow as Record<string, unknown>,
})
```

Note: For routes already returning the inserted row (tasks/route.ts already uses `.returning()`), the `entity_id` is trivially available from the result. For routes that do not use `.returning()`, add it.

### Pattern 3: Bulk Audit in Loop (ingestion/approve and discovery/approve)

**What:** Wrap each individual entity write + its audit insert inside `db.transaction()` per iteration
**When to use:** Bulk approve routes where multiple entities are written in a for-loop

```typescript
// Pattern for insertItem() in ingestion/approve/route.ts
// Each call becomes:
await db.transaction(async (tx) => {
  // existing insert logic (moved inside tx)
  const [inserted] = await tx.insert(actions).values({...}).returning()
  await tx.insert(auditLog).values({
    entity_type: 'action',
    entity_id: inserted.id,
    action: 'create',
    actor_id: 'default',
    before_json: null,
    after_json: inserted as Record<string, unknown>,
  })
})
```

For merge (using `mergeItem()`), the `findConflict()` SELECT result already provides `before_json` — no extra query needed.

### Pattern 4: WIZ-03 Filter Fix

**What:** One-line change to the `filesToExtract` filter in `AiPreviewStep.tsx`
**When to use:** This is the only change needed for WIZ-03

```typescript
// Line 59 — BEFORE (broken):
const filesToExtract = fileStatuses.filter(f => f.artifactId && f.status !== 'done')

// Line 59 — AFTER (fixed):
const filesToExtract = fileStatuses.filter(f => f.artifactId)
```

The inner loop on lines 64-69 already guards with `if (!file.artifactId || file.status === 'done') continue` — this guard remains correct for handling files that were already processed in a prior render. The outer filter only needs to check that an artifactId is present.

### Anti-Patterns to Avoid

- **Skipping `.returning()` for insert audit:** Without `.returning()`, the inserted row's `id` is unknown. All new INSERT calls in AUDIT-02 must use `.returning()` to capture `entity_id` for the audit entry.
- **Wrapping the entire bulk loop in one transaction:** If any single item fails, all previously written items would roll back. The decision is per-item transactions, consistent with existing error tolerance.
- **Calling `writeAuditLog()` outside the transaction:** The audit insert must be inside the same `db.transaction()` as the entity write so they are atomic.
- **Double-filtering in AiPreviewStep:** Do not add the status check back to the outer filter. The inner loop's `continue` guard is sufficient.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audit log write | Inline `db.insert(auditLog).values(...)` in each route | `writeAuditLog()` from `@/lib/audit` | Already exists, already tested, consistent interface |
| Transaction wrapping | Custom try/finally rollback | `db.transaction(async tx => {...})` | Drizzle handles rollback on exception |

**Key insight:** Both `writeAuditLog` helper and the `db.transaction()` pattern are already established. Phase 25 is purely about calling existing infrastructure from routes that currently skip it.

## Common Pitfalls

### Pitfall 1: findConflict() returns only { id: number }
**What goes wrong:** The conflict SELECT in `ingestion/approve/route.ts` returns only `{ id: number }`, not the full record. If used directly as `before_json`, it captures only the ID — missing all other fields.
**Why it happens:** The `findConflict()` helper was designed for conflict detection, not audit capture.
**How to avoid:** For merge operations, add the entity fields needed for `before_json` to the `findConflict()` SELECT, or do a separate full-record SELECT before the merge. The CONTEXT.md permits either approach.
**Warning signs:** `before_json` in audit_log contains only `{ id: N }` with no other fields.

### Pitfall 2: tasks/[id] route already fetches partial before-state
**What goes wrong:** `tasks/[id]/route.ts` already SELECTs `{ workstream_id }` before mutating — but this is only a partial select for the progress rollup, not a full record for `before_json`.
**Why it happens:** The existing SELECT was added for a different purpose (workstream rollup).
**How to avoid:** Add a full `db.select()` on `tasks` (all columns) for the before-state capture, separate from the partial workstream_id SELECT.
**Warning signs:** `before_json` in audit_log is missing task fields like `title`, `status`, `owner`.

### Pitfall 3: knowledge-base/[id] PATCH uses a dynamic updateData object
**What goes wrong:** The knowledge-base PATCH route builds `updateData` dynamically from body keys. The `before_json` capture must happen before this update, and `after_json` should be derived from the PATCH `.returning()` result.
**Why it happens:** The route doesn't use `.returning()` currently; it checks `result.length === 0` for 404.
**How to avoid:** The existing `.returning()` call already returns the updated row — use `result[0]` as `after_json`. Add a pre-update SELECT for `before_json`.

### Pitfall 4: plan-templates/[id] DELETE has no before-state fetch
**What goes wrong:** `plan-templates/[id]/route.ts` deletes immediately with no SELECT. No `before_json` is available.
**Why it happens:** Route was written before audit requirements existed.
**How to avoid:** Add a `db.select().from(planTemplates).where(eq(planTemplates.id, templateId))` before the delete. Use result as `before_json: null` if not found (graceful).

### Pitfall 5: discovery/approve route catches errors per-item without transactions
**What goes wrong:** The current `try/catch` per item in `discovery/approve` means a partial failure leaves some items written without audit. If the audit insert itself throws, the entity is written but not audited.
**Why it happens:** The route was designed for resilience (continue on error), not atomicity.
**How to avoid:** Wrap `insertDiscoveredItem()` + audit insert inside `db.transaction()` inside the existing try/catch. A transaction failure rolls back both entity write and audit insert together.

## Code Examples

### writeAuditLog helper (already exists)
```typescript
// Source: bigpanda-app/lib/audit.ts
export async function writeAuditLog(params: {
  entityType: string;
  entityId: number | null;
  action: 'create' | 'update' | 'delete';
  actorId?: string;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
}): Promise<void> {
  await db.insert(auditLog).values({
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    action: params.action,
    actor_id: params.actorId ?? 'default',
    before_json: params.beforeJson ?? null,
    after_json: params.afterJson ?? null,
  });
}
```

Note: `writeAuditLog` currently does NOT accept a transaction `tx` parameter — it uses the top-level `db`. For routes that need the audit inside a transaction, either:
(a) pass `tx` to the insert inline (matching the pattern in `artifacts/[id]/route.ts` and `e2e-workflows` routes), or
(b) extend `writeAuditLog` to accept an optional `tx` parameter.

The existing reference routes all use inline `tx.insert(auditLog)` inside `db.transaction()` — option (a) is consistent with the established pattern. The planner should specify which approach to use for each task.

### auditLog schema (from bigpanda-app/db/schema.ts)
```typescript
export const auditLog = pgTable('audit_log', {
  id:          serial('id').primaryKey(),
  entity_type: text('entity_type').notNull(),
  entity_id:   integer('entity_id'),
  action:      text('action').notNull(),
  actor_id:    text('actor_id'),
  // before_json and after_json are jsonb columns
  ...
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `db.insert(auditLog)` inline in each route | `writeAuditLog()` helper in `lib/audit.ts` | Phase 22 | Routes should use the helper for consistency |
| No audit on entity mutations | Phase 22 added audit to artifacts + e2e-workflow steps | Phase 22 | Phase 25 closes the remaining routes |

**Deprecated/outdated:**
- The `f.status !== 'done'` filter guard in `AiPreviewStep.tsx` line 59: incorrect since `CollateralUploadStep` always sets status to `'done'` on successful upload.

## Open Questions

1. **Transaction tx vs writeAuditLog helper**
   - What we know: All existing audit-logging routes use inline `tx.insert(auditLog)` inside `db.transaction()` — not the `writeAuditLog` helper. The helper does not accept a `tx` parameter.
   - What's unclear: Should Phase 25 routes extend `writeAuditLog` to accept `tx`, or use inline `tx.insert(auditLog)` directly (matching existing references)?
   - Recommendation: Use inline `tx.insert(auditLog).values({...})` inside `db.transaction()` for atomicity — consistent with `artifacts/[id]/route.ts` and `e2e-workflows` routes. The `writeAuditLog` helper is suitable for non-transactional audit inserts if needed (e.g., discovery/approve where the entity insert already succeeds).

2. **findConflict() before_json completeness**
   - What we know: Returns only `{ id: number }`.
   - What's unclear: For merge operations in ingestion/approve, should `findConflict()` be modified to return the full record, or should a second SELECT be added?
   - Recommendation: Add `.returning()` to the merge entity update so `after_json` is the full updated record. For `before_json` on merge, do a full-record SELECT before the merge (or extend `findConflict()` to select all columns). The CONTEXT.md leaves this to Claude's discretion.

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (configured in `bigpanda-app/vitest.config.ts`) |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `cd bigpanda-app && npx vitest run tests/audit/ tests/wizard/` |
| Full suite command | `cd bigpanda-app && npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WIZ-03 | Filter bug fix: `fileStatuses.filter(f => f.artifactId)` produces all uploaded files | unit | `cd bigpanda-app && npx vitest run tests/wizard/` | Partial — new test needed |
| WIZ-03 | SSE extraction fires for files with `status: 'done'` after upload step | unit | `cd bigpanda-app && npx vitest run tests/wizard/` | New test needed |
| AUDIT-02 | `writeAuditLog()` helper writes correct row shape for create/update/delete | unit | `cd bigpanda-app && npx vitest run tests/audit/audit-helper.test.ts` | YES (5 tests exist) |
| AUDIT-02 | ingestion/approve route writes audit_log rows per entity | integration (manual) | N/A — requires live DB | Manual only |
| AUDIT-02 | discovery/approve route writes audit_log rows per entity | integration (manual) | N/A — requires live DB | Manual only |
| AUDIT-02 | tasks PATCH/DELETE write audit_log rows | integration (manual) | N/A — requires live DB | Manual only |

### Existing Tests That Already Pass (GREEN)

- `tests/audit/audit-helper.test.ts` — 5 tests covering `writeAuditLog` for create/update/delete, numeric entity_id, null entity_id. These are already in RED (module exists now, so they should be GREEN after Phase 22). The planner should confirm current pass state.
- `tests/wizard/multi-file-accumulation.test.ts` — tests the accumulation contract; does not test the filter bug directly.
- `tests/wizard/checklist-match.test.ts` — tests category matching; unrelated to filter fix.

### Wave 0 Gaps (new tests needed)

- [ ] `bigpanda-app/tests/wizard/ai-preview-filter.test.ts` — tests that `fileStatuses.filter(f => f.artifactId)` returns files with `status: 'done'`, and that `fileStatuses.filter(f => f.artifactId && f.status !== 'done')` returns zero files (documents the bug and the fix)
- [ ] `bigpanda-app/tests/audit/ingestion-approve-audit.test.ts` — unit test with mocked `db` verifying that `insertItem()` and `mergeItem()` call `db.transaction()` and include an `auditLog` insert
- [ ] `bigpanda-app/tests/audit/discovery-approve-audit.test.ts` — unit test verifying `insertDiscoveredItem()` includes an audit insert inside a transaction

### Manual Verification Checklist (for /gsd:verify-work)

1. **WIZ-03 — E2E Flow 3:**
   - Open a project in the wizard's step 2 (CollateralUploadStep)
   - Upload a document (PDF or TXT)
   - Confirm file appears with status "Uploaded" (done)
   - Click Continue to step 3 (AiPreviewStep)
   - Confirm extraction spinner appears and SSE call fires (check Network tab: POST /api/ingestion/extract)
   - Confirm extracted items appear in the preview grouped by destination tab
   - Approve items and confirm they appear in the project tabs

2. **AUDIT-02 — ingestion approve:**
   - Run a wizard upload + extraction + approve flow
   - Query the database: `SELECT * FROM audit_log WHERE entity_type IN ('action','risk','milestone','stakeholder','task') ORDER BY id DESC LIMIT 20;`
   - Confirm one row per approved entity with correct `action`, `actor_id: 'default'`, `before_json`, `after_json`

3. **AUDIT-02 — discovery approve:**
   - Trigger a discovery scan and approve an item from the review queue
   - Query: `SELECT * FROM audit_log WHERE action = 'create' ORDER BY id DESC LIMIT 5;`
   - Confirm audit row present with correct entity_type and after_json

4. **AUDIT-02 — tasks CRUD:**
   - Create a task via the Tasks tab (POST /api/tasks) → confirm audit row with `action: 'create'`
   - Edit a task (PATCH /api/tasks/[id]) → confirm audit row with `action: 'update'` and before/after
   - Delete a task → confirm audit row with `action: 'delete'` and `after_json: null`

5. **AUDIT-02 — other routes:**
   - Create and delete a stakeholder → confirm audit rows
   - Update a workstream → confirm audit row
   - Create and delete a knowledge-base entry → confirm audit rows
   - Create and delete a plan template → confirm audit rows

### Sampling Rate
- **Per task commit:** `cd bigpanda-app && npx vitest run tests/audit/ tests/wizard/`
- **Per wave merge:** `cd bigpanda-app && npx vitest run`
- **Phase gate:** Full suite green + manual verification steps 1-5 completed before `/gsd:verify-work`

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `bigpanda-app/components/wizard/AiPreviewStep.tsx` — filter bug confirmed at line 59
- Direct code inspection: `bigpanda-app/components/wizard/CollateralUploadStep.tsx` — confirms `status: 'done'` is set on all successful uploads (line 139)
- Direct code inspection: `bigpanda-app/lib/audit.ts` — `writeAuditLog` helper exists and is complete
- Direct code inspection: `bigpanda-app/app/api/artifacts/[id]/route.ts` — reference implementation for single-entity audit in transaction
- Direct code inspection: `bigpanda-app/app/api/projects/.../e2e-workflows/.../steps/.../route.ts` — reference for both UPDATE and DELETE audit in transactions
- Direct code inspection: `bigpanda-app/tests/audit/audit-helper.test.ts` — 5 pre-written test cases covering all action types
- Direct code inspection: all 9 target route files — confirmed no existing audit calls

### Secondary (MEDIUM confidence)
- `.planning/phases/25-wizard-fix-audit-completion/25-CONTEXT.md` — locked implementation decisions, specific line numbers, route enumeration

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries in use, no new dependencies
- Architecture: HIGH — patterns directly observed in existing production code
- Pitfalls: HIGH — identified from direct code inspection of target routes
- Fix scope: HIGH — both changes are fully specified with line numbers and route paths

**Research date:** 2026-03-30
**Valid until:** 2026-05-30 (stable codebase, no external dependency changes expected)
