---
phase: 20-project-initiation-wizard
plan: "02"
subsystem: api
tags: [next.js, drizzle, postgresql, tdd, vitest, wizard, draft-status]

requires:
  - phase: 20-01
    provides: "draft status enum in DB + projects columns (description, start_date, end_date) + Wave 0 RED test stubs"

provides:
  - "bigpanda-app/app/api/projects/route.ts — POST handler creating projects with status=draft"
  - "bigpanda-app/app/api/projects/[projectId]/route.ts — PATCH handler for status updates (GET unchanged)"

affects:
  - wizard UI components (Plans 03-05) — these routes are called by step 1 (create) and step 5 (launch)

tech-stack:
  added: []
  patterns:
    - "Next.js App Router route.ts with multiple HTTP method exports"
    - "Drizzle .returning({ id }) pattern for insert with minimal return payload"
    - "PATCH status update using .returning() empty check for 404 detection (no separate SELECT)"

key-files:
  created:
    - bigpanda-app/app/api/projects/route.ts
  modified:
    - bigpanda-app/app/api/projects/[projectId]/route.ts

key-decisions:
  - "PATCH existence check via .returning() empty array instead of pre-select — avoids extra DB round-trip and test mock complexity"
  - "POST route hardcodes status='draft' — all wizard-created projects start as drafts, activated only at step 5 Launch"

patterns-established:
  - "Projects created via POST /api/projects always start with status=draft"
  - "PATCH /api/projects/[projectId] returns { ok: true } on success, 404 via returning() empty check"

requirements-completed:
  - WIZ-02
  - WIZ-07

duration: 5min
completed: 2026-03-26
---

# Phase 20 Plan 02: Wizard API Routes Summary

**POST /api/projects (draft creation) and PATCH /api/projects/[projectId] (status update) implemented with TDD — 4 wizard tests turned GREEN, 131 total tests passing.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-26T16:56:00Z
- **Completed:** 2026-03-26T16:57:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `POST /api/projects` route that inserts a project with `status='draft'` and returns `{ project: { id } }`
- Added `PATCH` handler to existing `[projectId]/route.ts` alongside the existing `GET` — returns `{ ok: true }` on success
- Both wizard test files turned GREEN (create-project.test.ts + launch.test.ts)
- Full vitest suite: 131 tests passing, 0 regressions

## Task Commits

1. **Task 1: POST /api/projects** - `4d0f776` (feat)
2. **Task 2: PATCH /api/projects/[projectId]** - `d28461b` (feat)

## Files Created/Modified

- `bigpanda-app/app/api/projects/route.ts` — New POST handler: validates name+customer required, sets status=draft, returns 201 with { project: { id } }
- `bigpanda-app/app/api/projects/[projectId]/route.ts` — Added PATCH export: validates numeric projectId, updates status + updated_at, uses returning() for 404 detection

## Decisions Made

- PATCH handler uses `.returning({ id })` to detect non-existent project (empty array = 404) rather than a pre-flight SELECT — avoids an extra DB round-trip and aligns with the test mock structure (mock only provides `update.set.where.returning`, no `select`)
- POST hardcodes `status: 'draft'` — per phase context, wizard-created projects remain Draft until step 5 Launch

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `POST /api/projects` and `PATCH /api/projects/[projectId]` are ready for Plans 03-05 (wizard UI components)
- Remaining RED wizard tests: completeness.test.ts, completeness-banner.test.ts, manual-entry.test.ts, checklist-match.test.ts — all target components not yet built (future plans)

## Self-Check: PASSED

- bigpanda-app/app/api/projects/route.ts — FOUND
- bigpanda-app/app/api/projects/[projectId]/route.ts — FOUND
- Commit 4d0f776 — FOUND
- Commit d28461b — FOUND

---
*Phase: 20-project-initiation-wizard*
*Completed: 2026-03-26*
