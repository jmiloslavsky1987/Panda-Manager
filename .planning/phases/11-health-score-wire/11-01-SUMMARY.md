---
phase: 11-health-score-wire
plan: "01"
subsystem: health-score
tags: [health, workstreams, dashboard, tdd, plan-09]
dependency_graph:
  requires: [queries.ts computeHealth, workstreams schema, HealthCard.tsx]
  provides: [stalledWorkstreams in ProjectWithHealth, HealthCard stalledWorkstreams metric, DELETE rollup]
  affects: [Dashboard HealthCard, task DELETE route, health.test.ts unit suite]
tech_stack:
  added: []
  patterns: [TDD RED-GREEN, assert-if-present E2E, chainable vi.fn mock]
key_files:
  created:
    - bigpanda-app/app/api/__tests__/health.test.ts
  modified:
    - bigpanda-app/lib/queries.ts
    - bigpanda-app/components/HealthCard.tsx
    - bigpanda-app/app/api/tasks/[id]/route.ts
    - tests/e2e/phase3.spec.ts
decisions:
  - "buildSelectMock uses per-call index cycling (not mockResolvedValueOnce) for predictable query sequencing in getProjectWithHealth tests"
  - "then polyfill avoided in mock — used mockImplementation returning a plain object with from/where/limit chain; avoids TS2322 type mismatch"
  - "stalledWorkstreams: number added to ProjectWithHealth after stalledMilestones — consistent alphabetical/semantic ordering"
metrics:
  duration: "~3min"
  completed_date: "2026-03-25"
  tasks_completed: 3
  tasks_total: 4
  files_created: 1
  files_modified: 4
---

# Phase 11 Plan 01: Health Score Wire Summary

**One-liner:** Wired stalledWorkstreams from computeHealth() DB query through ProjectWithHealth interface and HealthCard UI, plus DELETE route rollup to prevent stale percent_complete.

## What Was Built

Three surgical edits closed the PLAN-09 gap where `stalledWorkstreams` was computed in `computeHealth()` but silently discarded:

1. **queries.ts** — Added `stalledWorkstreams: number` to `computeHealth()` return type and return statement; added same field to `ProjectWithHealth` interface. The `{ ...p, ...healthData }` spread in `getActiveProjects()` and `getProjectWithHealth()` propagates it automatically — no changes needed there.

2. **HealthCard.tsx** — Added third `<span>` for `stalledWorkstreams` metric: orange text when `> 0`, matching the `highRisks` highlight pattern. Renders "N stalled workstream(s)".

3. **tasks/[id]/route.ts DELETE** — Fetches `workstream_id` before deletion, then calls `updateWorkstreamProgress()` after delete if `workstream_id` exists. Prevents stale `percent_complete` after task removal. Pattern mirrors existing PATCH rollup.

4. **health.test.ts** — New unit test file with 3 tests verifying `stalledWorkstreams` propagation through `getProjectWithHealth()`. TDD RED-GREEN cycle: stubs committed first (Wave 0), real assertions implemented after production fix. All 3 GREEN.

5. **phase3.spec.ts** — PLAN-09 test replaced (no longer a stub). Navigates to Dashboard, asserts health card renders, conditionally verifies `stalled workstream` text when DB is seeded.

## Verification Results

- `npx vitest run app/api/__tests__/health.test.ts` — 3/3 GREEN
- `npx vitest run app/api/__tests__/` — 8/8 GREEN (no regression in ai-plan or sprint-summary tests)
- `npx tsc --noEmit` on modified files — 0 new errors (pre-existing ioredis/bullmq and js-yaml type errors unaffected)
- `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-09"` — 1/1 PASSED

## Deviations from Plan

None — plan executed exactly as written.

## Auth Gates

None.

## Tasks

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Create health.test.ts unit stub (Wave 0 RED) | fbca5c6 | COMPLETE |
| 2 | Wire stalledWorkstreams through queries.ts, HealthCard, and DELETE rollup | 3aa2f8c | COMPLETE |
| 3 | Replace PLAN-09 E2E stub with real assertion | 752e0e3 | COMPLETE |
| 4 | Human verify checkpoint | — | COMPLETE (approved 2026-03-25) |

## Self-Check: PASSED

- bigpanda-app/app/api/__tests__/health.test.ts — FOUND
- bigpanda-app/lib/queries.ts (stalledWorkstreams in return) — FOUND
- bigpanda-app/components/HealthCard.tsx (stalled workstream span) — FOUND
- bigpanda-app/app/api/tasks/[id]/route.ts (updateWorkstreamProgress in DELETE) — FOUND
- Commits fbca5c6, 3aa2f8c, 752e0e3 — FOUND
