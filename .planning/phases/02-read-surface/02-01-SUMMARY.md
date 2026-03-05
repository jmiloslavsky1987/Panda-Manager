---
phase: 02-read-surface
plan: "01"
subsystem: client+server

tags: [wave0, test-stubs, deriveCustomer, supertest, clsx, dependencies]

# Dependency graph
requires: []
provides:
  - supertest installed as server devDependency
  - clsx installed as client dependency
  - client/src/lib/deriveCustomer.js — 9 pure derivation functions (full implementation)
  - server/routes/risks.test.js — 5 t.todo stubs (Wave 0 gate for 02-02)
  - server/routes/milestones.test.js — 4 t.todo stubs (Wave 0 gate for 02-02)
  - client/src/lib/deriveCustomer.test.js — 20 t.todo stubs (Wave 0 gate for 02-03)
affects:
  - 02-02 (risks/milestones PATCH — references test stub files)
  - 02-03 (client components — imports deriveCustomer.js)

# Tech tracking
tech-stack:
  added:
    - supertest (server devDependency — supertest integration testing)
    - clsx (client dependency — conditional CSS class joining)
  patterns:
    - "WORKSTREAM_CONFIG: flat object shape (adr/biggy groups) — not arrays"
    - "history[0] = most recent — prepend-ordered history"
    - "deriveOverallStatus: red/off_track → 'off_track'; yellow/at_risk/in_progress → 'at_risk'; else 'on_track'"

key-files:
  created:
    - client/src/lib/deriveCustomer.js
    - client/src/lib/deriveCustomer.test.js
    - server/routes/risks.test.js
    - server/routes/milestones.test.js

key-decisions:
  - "deriveCustomer.js implemented in full at Wave 0 (not skeleton) — pure functions safe to implement without server dependency"
  - "History[0] is newest entry (prepend-ordered) — all derive functions use history[0] as primary data source"
  - "WORKSTREAM_CONFIG defined in deriveCustomer.js as single source of truth for workstream keys and labels"

requirements-completed: [DASH-03, DASH-05, DASH-06, DASH-07, CUST-04, CUST-05, CUST-06, CUST-09, UI-01]

# Metrics
duration: ~3min
completed: 2026-03-05
commit: d50de26
---

# Phase 2 Plan 01: Wave 0 — Test Stubs + deriveCustomer.js Summary

**Wave 0 scaffold: supertest + clsx installed; deriveCustomer.js with 9 pure functions; 3 test stub files with 29 total t.todo gates — all exit 0**

*Note: This summary was created retrospectively — work was executed in commit d50de26 but SUMMARY.md was not written at the time.*

## Performance

- **Duration:** ~3 min
- **Completed:** 2026-03-05
- **Commit:** `d50de26`
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

### Task 1: Dependencies + deriveCustomer.js

- `supertest` installed as server devDependency
- `clsx` installed as client dependency
- `client/src/lib/deriveCustomer.js` created with **full implementation** of all 9 pure functions:
  - `WORKSTREAM_CONFIG` — ADR (4 sub-workstreams) + Biggy (2 sub-workstreams) flat object map
  - `getLatestHistory` — returns `history[0]` (prepend-ordered, newest first)
  - `deriveOverallStatus` — red/off_track → off_track; yellow/at_risk/in_progress → at_risk; else on_track
  - `derivePercentComplete` — average of all sub-workstream percent_complete values
  - `deriveDaysToGoLive` — days until project.go_live_date (null if missing)
  - `countOpenActions` — count actions where status ≠ completed
  - `countHighRisks` — count risks where severity=high AND status=open
  - `sortCustomers` — Dashboard sort: at_risk=0, on_track=1, off_track=2
  - `getMostOverdueActions` — top 3 earliest-due open actions

### Task 2: Test Stub Files

All three stub files created with t.todo() (exit 0 before implementation):

| File | Stubs | Purpose |
|------|-------|---------|
| server/routes/risks.test.js | 5 | PATCH /api/customers/:id/risks/:riskId |
| server/routes/milestones.test.js | 4 | PATCH /api/customers/:id/milestones/:milestoneId |
| client/src/lib/deriveCustomer.test.js | 20 | All 9 derivation functions |
| **Total** | **29** | All exit 0 ✅ |

## Files Created/Modified

- `client/src/lib/deriveCustomer.js` — full 9-function implementation (96 lines)
- `client/src/lib/deriveCustomer.test.js` — 20 t.todo stubs
- `server/routes/risks.test.js` — 5 t.todo stubs
- `server/routes/milestones.test.js` — 4 t.todo stubs
- `client/package.json` + `client/package-lock.json` — clsx added
- `server/package.json` + `server/package-lock.json` — supertest added

## Decisions Made

- deriveCustomer.js implemented in full (not as skeleton) — pure functions have no dependencies so it was safe to fully implement at Wave 0
- WORKSTREAM_CONFIG defined here as the canonical workstream key/label map — later expanded in Phase 3 (03-01) to 11 sub-workstreams matching WORKSTREAM_CONFIG in deriveCustomer.js

## Deviations from Plan

- Plan specified deriveCustomer.js as a skeleton (stubs only); implementation delivered the full functions — no correctness risk since they are pure functions

## Next Phase Readiness

- 02-02: risks.test.js and milestones.test.js stubs are ready; supertest installed; app exportable via require('../index')
- 02-03: deriveCustomer.js exports are ready; deriveCustomer.test.js stubs define all test cases

---
*Phase: 02-read-surface*
*Completed: 2026-03-05*
*Retrospective summary — commit d50de26*
