# Phase 25: Wizard Fix + Audit Completion - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Two targeted code fixes that close the last wiring gaps from the v2.0 milestone audit:

1. **WIZ-03**: Fix the filter bug in `AiPreviewStep.tsx` that prevents the SSE extraction call from firing when the wizard transitions from step 2 (upload) to step 3 (AI preview). E2E Flow 3 — wizard upload → ingestion → extraction → items in project tabs — must complete end-to-end.

2. **AUDIT-02**: Add `audit_log` writes to all workspace entity mutation routes that currently bypass logging. This includes the bulk-ingest paths (ingestion/approve, discovery/approve) and several single-entity routes (tasks/[id], tasks POST, stakeholders POST, workstreams, knowledge-base, plan-templates).

**Out of scope:** New features, schema changes, new UI surfaces, time-entry audit, settings/config audit, OAuth/skill routes.

</domain>

<decisions>
## Implementation Decisions

### WIZ-03 filter fix
- Fix is in `bigpanda-app/components/wizard/AiPreviewStep.tsx` line 59
- The filter `fileStatuses.filter(f => f.artifactId && f.status !== 'done')` incorrectly excludes all uploaded files — `CollateralUploadStep` sets `status: 'done'` after a successful upload, so by the time `AiPreviewStep` renders, every file is filtered out and no extraction calls fire
- Fix: check only `f.artifactId` (remove the `f.status !== 'done'` condition); the extraction loop in `AiPreviewStep` already tracks its own local status state
- No refactor needed — this is a one-line change

### AUDIT-02 — which routes to cover
Audit logging must be added to all of the following (routes currently missing it):
- `app/api/ingestion/approve/route.ts` — bulk insert/merge/delete of workspace entities
- `app/api/discovery/approve/route.ts` — bulk insert of workspace entities from discovery items
- `app/api/tasks/[id]/route.ts` — PATCH + DELETE
- `app/api/tasks/route.ts` — POST (create)
- `app/api/stakeholders/route.ts` — POST (create)
- `app/api/workstreams/[id]/route.ts` — all mutation methods present
- `app/api/knowledge-base/[id]/route.ts` and `knowledge-base/route.ts` — all mutation methods
- `app/api/plan-templates/[id]/route.ts` and `plan-templates/route.ts` — all mutation methods

### actor_id convention
- Use `actor_id: 'default'` — consistent with all existing audit entries; app is single-user with no auth

### Audit granularity for bulk ingestion/discovery approve routes
- Write **one audit_log row per entity written** (not a batch summary) — consistent with how individual CRUD mutations are logged; queryable by entity_id
- For **inserts** (new record created): `before_json: null`, `after_json: { entity fields }`
- For **merges** (existing record updated): capture `before_json` from the conflict-check SELECT result already performed earlier in the same loop iteration — no extra query needed
- For **deletes** (replace operation, step 1 deletes then re-inserts): `before_json: { existing fields }`, `after_json: null` for the delete; then a separate insert audit entry for the re-insert

### Transaction strategy for bulk routes
- Wrap each entity write + its audit_log insert in a **DB transaction** — consistent with the `db.transaction()` pattern in `artifacts/[id]/route.ts` and `e2e-workflows` routes
- A failed audit insert rolls back the entity write — ensures audit completeness

### Single-entity routes (tasks, stakeholders, workstreams, knowledge-base, plan-templates)
- Follow the existing per-operation pattern from Phase 22: SELECT before state → write entity → INSERT into audit_log, all inside a transaction
- `action` field values: `'create'` for POST, `'update'` for PATCH/PUT, `'delete'` for DELETE

### Claude's Discretion
- Exact entity fields to capture in after_json for each entity type in bulk routes (use the full inserted/updated field set)
- How to handle the `entity_id` for inserted rows — retrieve the inserted row's id via `.returning()` or a follow-up SELECT
- Error handling strategy if the before-state SELECT fails (proceed with before_json: null vs abort)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bigpanda-app/db/schema.ts`: `auditLog` table — `entity_type`, `entity_id`, `action`, `actor_id`, `before_json`, `after_json`, `created_at`
- `bigpanda-app/app/api/artifacts/[id]/route.ts`: Reference implementation — `db.transaction(tx => { ... tx.insert(auditLog).values({...}) })`; captures before state via SELECT before update
- `bigpanda-app/app/api/projects/[projectId]/e2e-workflows/[workflowId]/steps/[stepId]/route.ts`: Another reference with both create and update audit entries in the same route

### Established Patterns
- **Before-state capture**: SELECT existing record before mutating; use result as `before_json`
- **Transaction wrapping**: All entity write + audit pairs are wrapped in `db.transaction()`
- **actor_id**: Always `'default'` — single-user app, no auth context
- **SSE extraction**: `AiPreviewStep` has its own local status state (`localStatuses`) separate from the `fileStatuses` prop — the bug is only in the initial filter, not in the tracking logic

### Integration Points
- `AiPreviewStep.tsx` line 59 — filter fix goes here; `hasStartedRef` guard prevents double-extraction on re-renders
- Ingestion approve route: `insertItem()` and `mergeItem()` helper functions should be wrapped in `db.transaction()` calls and include audit insert
- Discovery approve route: `insertDiscoveredItem()` helper should similarly be wrapped with an audit insert

</code_context>

<specifics>
## Specific Ideas

- The ingestion/approve route already performs a `findConflict()` SELECT before each merge — reuse that result directly as `before_json` in the audit entry (no redundant query)
- For the WIZ-03 fix: `AiPreviewStep` already initializes `localStatuses` from the `fileStatuses` prop and manages its own extraction state — the fix is simply removing the status pre-filter so all files with an `artifactId` are passed to the extraction loop

</specifics>

<deferred>
## Deferred Ideas

- Time-entry mutations (time-entries/[entryId], time-entries/bulk, time-entries/submit, time-entries/approve/reject) — these are time-tracking operations, not workspace entity mutations; appropriate for a future audit pass
- Settings, scheduler config, and OAuth routes — not workspace records; out of scope
- Discovery dismiss/dismiss-history — dismissal is a status change on discovery_items, not a workspace entity write; could be audited separately

</deferred>

---

*Phase: 25-wizard-fix-audit-completion*
*Context gathered: 2026-03-30*
