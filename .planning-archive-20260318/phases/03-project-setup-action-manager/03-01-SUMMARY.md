---
phase: 03-project-setup-action-manager
plan: "01"
subsystem: testing
tags: [node-test, yaml, fixtures, deriveCustomer, workstreams, actions]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: sample.yaml fixture, driveService mock pattern, node:test infrastructure
provides:
  - Updated sample.yaml fixture with 11-subworkstream schema (ADR x6, Biggy x5)
  - actions.test.js stub file (12 todos) ready for Wave 1 route implementation
  - workstreams.test.js stub file (5 todos) ready for Wave 1 route implementation
  - WORKSTREAM_OPTIONS export (flat {value,label} array for UI selects)
  - STATUS_CYCLE export (action status transition map)
  - 8 new passing deriveCustomer unit tests
affects:
  - 03-02 (actions route implementation depends on actions.test.js stubs and sample.yaml)
  - 03-03 (workstreams route implementation depends on workstreams.test.js stubs and sample.yaml)
  - All Phase 3+ plans that use sample.yaml fixture

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "driveService mock injected via require.cache before app load — same pattern as risks.test.js"
    - "t.todo() stubs for Wave N+1 routes so test runner exits 0 before implementation (Nyquist compliance)"
    - "WORKSTREAM_CONFIG.flatMap pattern to derive WORKSTREAM_OPTIONS from canonical config"

key-files:
  created:
    - server/routes/actions.test.js
    - server/routes/workstreams.test.js
  modified:
    - server/fixtures/sample.yaml
    - client/src/lib/deriveCustomer.js
    - client/src/lib/deriveCustomer.test.js

key-decisions:
  - "scope arrays included only on hasScope sub-workstreams in sample.yaml (inbound_integrations, outbound_integrations, udc, real_time_integrations)"
  - "history entries in sample.yaml do NOT include scope fields — history records state snapshot, not config"
  - "STATUS_CYCLE maps completed->open as safe fallback to avoid invalid state on double-complete"
  - "WORKSTREAM_OPTIONS derived at module load from WORKSTREAM_CONFIG — single source of truth, no duplication"

patterns-established:
  - "Pattern: Test stubs use t.todo() so runner exits 0 before Wave N+1 implementation"
  - "Pattern: sample.yaml is the single canonical fixture — all route tests load it via readFileSync before mock injection"

requirements-completed: [ACT-01, ACT-02, ACT-04, ACT-05, ACT-06, ACT-07, ACT-09, ACT-11, ACT-12]

# Metrics
duration: 3min
completed: 2026-03-05
---

# Phase 3 Plan 01: Project Setup + Action Manager Wave 0 Summary

**11-subworkstream sample.yaml fixture + actions/workstreams test stubs + WORKSTREAM_OPTIONS/STATUS_CYCLE exports with 39 passing deriveCustomer unit tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T15:28:26Z
- **Completed:** 2026-03-05T15:31:02Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Replaced old 4-key workstreams schema in sample.yaml with correct 11-subworkstream structure (ADR x6 + Biggy x5), including scope arrays on 4 hasScope sub-workstreams
- Created actions.test.js (12 stubs) and workstreams.test.js (5 stubs) using identical driveService mock pattern from risks.test.js — both exit 0 before routes exist
- Exported WORKSTREAM_OPTIONS and STATUS_CYCLE from deriveCustomer.js; added 8 new passing unit tests (deriveCustomer suite: 31 -> 39)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update sample.yaml to 11-subworkstream structure** - `00640c8` (feat)
2. **Task 2: Create actions.test.js and workstreams.test.js stubs** - `2a58644` (test)
3. **Task 3: Add Phase 3 unit tests to deriveCustomer.test.js** - `cbf20dd` (feat)

## Files Created/Modified
- `server/fixtures/sample.yaml` - Updated workstreams block: 4 old keys replaced with 11 correct sub-workstreams; history[0].workstreams updated to match; scope arrays on hasScope sub-workstreams only
- `server/routes/actions.test.js` - New: 12 t.todo() stubs for POST add-action and PATCH edit/complete/reopen/delay routes
- `server/routes/workstreams.test.js` - New: 5 t.todo() stubs for PATCH workstreams atomic-write route
- `client/src/lib/deriveCustomer.js` - Added WORKSTREAM_OPTIONS (flat 11-entry select array) and STATUS_CYCLE (open->delayed->in_review->open, completed->open)
- `client/src/lib/deriveCustomer.test.js` - Imported WORKSTREAM_OPTIONS and STATUS_CYCLE; appended 8 new passing tests across 3 describe blocks

## Decisions Made
- scope arrays included only on hasScope sub-workstreams (inbound_integrations, outbound_integrations, udc, real_time_integrations) in both workstreams and fixture YAML
- history entries in sample.yaml deliberately omit scope fields — history is a state snapshot, not config
- STATUS_CYCLE maps `completed->open` as safe fallback to prevent invalid state on double-complete action
- WORKSTREAM_OPTIONS derived at module load from WORKSTREAM_CONFIG — single source of truth avoids duplication

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Shell escaped `!` characters in `node -e` inline verification command — resolved by running verification via a temp .cjs script file in the server directory (where js-yaml is installed).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- sample.yaml fixture is correct for all Wave 1+ route tests
- actions.test.js stubs ready for Plan 03-02 (actions route implementation)
- workstreams.test.js stubs ready for Plan 03-03 (workstreams route implementation)
- WORKSTREAM_OPTIONS available for React select components in Phase 3+ UI plans

## Self-Check: PASSED

All files verified present. All commits verified in git history.

| Check | Result |
|-------|--------|
| server/fixtures/sample.yaml | FOUND |
| server/routes/actions.test.js | FOUND |
| server/routes/workstreams.test.js | FOUND |
| client/src/lib/deriveCustomer.js | FOUND |
| client/src/lib/deriveCustomer.test.js | FOUND |
| .planning/phases/03-project-setup-action-manager/03-01-SUMMARY.md | FOUND |
| Commit 00640c8 | FOUND |
| Commit 2a58644 | FOUND |
| Commit cbf20dd | FOUND |

---
*Phase: 03-project-setup-action-manager*
*Completed: 2026-03-05*
