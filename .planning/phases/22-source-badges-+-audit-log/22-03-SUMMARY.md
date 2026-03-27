---
phase: 22-source-badges-+-audit-log
plan: "03"
subsystem: api
tags: [drizzle, postgresql, audit-log, transactions, workspace-routes]

# Dependency graph
requires:
  - phase: 22-02
    provides: auditLog table in schema + writeAuditLog helper in lib/audit.ts
provides:
  - All 13 workspace entity API routes instrumented with audit log writes
  - PATCH routes: before-state capture + mutation + audit insert in single transaction
  - DELETE routes: before-state capture + audit insert before delete in same transaction
  - POST routes (decisions, notes): create audit with after_json=new record
  - Append-only safety: key_decisions and engagement_history get create audit only
affects: [22-04, 22-05, audit-log-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "before-fetch outside transaction, mutation + audit inside transaction (PATCH pattern)"
    - "audit before delete, delete after (DELETE pattern)"
    - "tx.insert(auditLog).values({...}) directly inside Drizzle transactions — no helper indirection"
    - "actions route: xlsx write first (outside tx), then db.transaction(update + audit)"

key-files:
  created: []
  modified:
    - bigpanda-app/app/api/actions/[id]/route.ts
    - bigpanda-app/app/api/risks/[id]/route.ts
    - bigpanda-app/app/api/milestones/[id]/route.ts
    - bigpanda-app/app/api/stakeholders/[id]/route.ts
    - bigpanda-app/app/api/artifacts/[id]/route.ts
    - bigpanda-app/app/api/decisions/route.ts
    - bigpanda-app/app/api/notes/route.ts
    - bigpanda-app/app/api/projects/[projectId]/business-outcomes/[id]/route.ts
    - bigpanda-app/app/api/projects/[projectId]/focus-areas/[id]/route.ts
    - bigpanda-app/app/api/projects/[projectId]/architecture-integrations/[id]/route.ts
    - bigpanda-app/app/api/projects/[projectId]/e2e-workflows/[workflowId]/route.ts
    - bigpanda-app/app/api/projects/[projectId]/e2e-workflows/[workflowId]/steps/[stepId]/route.ts
    - bigpanda-app/app/api/projects/[projectId]/team-onboarding-status/[id]/route.ts

key-decisions:
  - "Used tx.insert(auditLog) directly inside transactions rather than writeAuditLog() helper — helper uses db not tx, would break atomicity"
  - "Risks route restructured: always fetch before-state regardless of mitigation_append (simplifies logic, eliminates conditional select)"
  - "Workflow steps DELETE: audit inserted only when beforeDelete exists (graceful non-found handling)"

patterns-established:
  - "PATCH audit: SELECT before update (outside tx), tx(update + audit log insert)"
  - "DELETE audit: SELECT before delete (outside tx), tx(audit log insert + delete)"
  - "append-only CREATE audit: insert + returning(), then insert audit with after_json=new record"

requirements-completed: [AUDIT-02, AUDIT-03]

# Metrics
duration: 4min
completed: "2026-03-27"
---

# Phase 22 Plan 03: Route Audit Instrumentation Summary

**All 13 workspace entity API routes instrumented with Drizzle-transaction audit log writes covering PATCH, DELETE, and append-only POST operations**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T17:35:37Z
- **Completed:** 2026-03-27T17:39:39Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Instrumented 5 core entity PATCH routes (actions, risks, milestones, stakeholders, artifacts) with before-state fetch + transaction wrapping + audit insert
- Instrumented 8 Teams/Architecture + append-only routes — 6 with PATCH+DELETE audit, 2 (decisions, notes) with create-only audit matching DB trigger constraints
- Actions route preserves xlsx-first ordering: xlsx write outside tx, then db.transaction(update + audit) — xlsx failure blocks DB write correctly
- Risks route simplified: always fetches before-state (removes conditional select for mitigation_append case)
- All 36 test files remain GREEN (155 tests passed); no TypeScript errors in any modified routes

## Task Commits

Each task was committed atomically:

1. **Task 1: Core entity PATCH routes (actions, risks, milestones, stakeholders, artifacts)** - `b8789a3` (feat)
2. **Task 2: Append-only create routes + Teams/Architecture PATCH+DELETE routes** - `8bb0557` (feat)

**Plan metadata:** _(docs commit — see below)_

## Files Created/Modified

- `bigpanda-app/app/api/actions/[id]/route.ts` - auditLog import; before-fetch; xlsx-first preserved; db.transaction(update + audit)
- `bigpanda-app/app/api/risks/[id]/route.ts` - auditLog import; always-fetch before-state; transaction wraps update + audit
- `bigpanda-app/app/api/milestones/[id]/route.ts` - auditLog import; before-fetch; transaction wraps update + audit
- `bigpanda-app/app/api/stakeholders/[id]/route.ts` - auditLog import; before-fetch; transaction wraps update + audit
- `bigpanda-app/app/api/artifacts/[id]/route.ts` - auditLog import; before-fetch; transaction wraps update + audit
- `bigpanda-app/app/api/decisions/route.ts` - auditLog import; insert().returning() + audit insert (create only)
- `bigpanda-app/app/api/notes/route.ts` - auditLog import; insert().returning() + audit insert (create only)
- `bigpanda-app/app/api/projects/[projectId]/business-outcomes/[id]/route.ts` - PATCH+DELETE audit
- `bigpanda-app/app/api/projects/[projectId]/focus-areas/[id]/route.ts` - PATCH+DELETE audit
- `bigpanda-app/app/api/projects/[projectId]/architecture-integrations/[id]/route.ts` - PATCH+DELETE audit
- `bigpanda-app/app/api/projects/[projectId]/e2e-workflows/[workflowId]/route.ts` - PATCH+DELETE audit
- `bigpanda-app/app/api/projects/[projectId]/e2e-workflows/[workflowId]/steps/[stepId]/route.ts` - PATCH+DELETE audit with workflow ownership check preserved
- `bigpanda-app/app/api/projects/[projectId]/team-onboarding-status/[id]/route.ts` - PATCH+DELETE audit

## Decisions Made

- Used `tx.insert(auditLog).values({...})` directly inside Drizzle transactions rather than the `writeAuditLog()` helper from lib/audit.ts — the helper uses the top-level `db` connection, which would not be atomic with the surrounding transaction
- Risks route was refactored to always fetch before-state unconditionally (previously only fetched when `mitigation_append` was present), simplifying the code and enabling clean audit capture
- Workflow steps DELETE: audit is conditional on `beforeDelete` existing (graceful handling if step was already gone before transaction begins)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all 13 routes modified cleanly. Pre-existing TypeScript errors in unrelated files (Redis worker, ingestion, wizard tests, js-yaml) are out-of-scope and unchanged.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All workspace entity mutations now write to audit_log atomically
- AUDIT-02 (all mutations logged) and AUDIT-03 server-side (delete before-state captured) are satisfied
- Ready for Plan 22-04 (audit log UI / query API) — data is being written to the table on every mutation

---
*Phase: 22-source-badges-+-audit-log*
*Completed: 2026-03-27*
