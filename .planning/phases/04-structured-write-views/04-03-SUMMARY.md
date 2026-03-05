---
phase: 04-structured-write-views
plan: "03"
subsystem: server-api
tags: [node:test, history, post, prepend, unshift, tdd, atomic-write, integer-coercion]

# Dependency graph
requires:
  - phase: 04-structured-write-views
    plan: "01"
    provides: history.test.js with 3 t.todo() stubs (UPD-04)
provides:
  - server/routes/history.js POST endpoint — prepends history entries (unshift)
  - server/routes/history.test.js — 3 passing assertions proving prepend + write behaviour
affects:
  - 04-05 (Weekly Update Form — depends on this POST endpoint)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "history.unshift(entry) — PREPEND pattern: history[0] is always most recent"
    - "parseInt(sub.percent_complete, 10) || 0 — integer coercion for HTML input safety"
    - "node:test mock API: calls[0].arguments[N] not calls[0][N] (Sinon-style breaks)"
    - "mockWriteYamlFile.mock.resetCalls() before POST to isolate per-test call counts"

key-files:
  created: []
  modified:
    - server/routes/history.js
    - server/routes/history.test.js

key-decisions:
  - "node:test mock call argument access is calls[N].arguments[I] — plan example used Sinon-style calls[N][I] which fails silently (undefined)"
  - "week_ending key confirmed (not week_of) — Pitfall 1 avoided at implementation time"
  - "percent_complete coerced inline with parseInt — no helper function extracted (single use site)"

# Metrics
duration: 2min
completed: 2026-03-05
---

# Phase 4 Plan 03: History POST Endpoint — Implementation + Tests Summary

**History POST endpoint with unshift-based prepend, integer coercion for percent_complete, and 3 green node:test assertions proving prepend ordering via written YAML inspection**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T18:13:10Z
- **Completed:** 2026-03-05T18:15:12Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced 501 stub in `server/routes/history.js` with full POST implementation
- Atomic write pattern: readYamlFile → parseYaml → validateYaml → unshift → serializeYaml → writeYamlFile → 201
- `data.history.unshift(normalizedEntry)` — PREPEND, never push (Pitfall ordering avoided)
- `parseInt(sub.percent_complete, 10) || 0` for all workstream sub-entries (Pitfall 5 avoided)
- `week_ending` key used in code and tests (Pitfall 1 avoided)
- Replaced 3 t.todo() stubs in `history.test.js` with real async assertions
- Fixed node:test mock API: `calls[0].arguments[1]` (not Sinon-style `calls[0][1]`)
- Full suite: 36 pass, 0 fail, 0 todo (no regressions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement history.js POST** - `f4b2eef` (feat)
2. **Task 2: Fill history.test.js assertions** - `17aa26f` (test)

## Files Created/Modified

- `server/routes/history.js` — 501 stub replaced with full POST (read→parse→validate→normalize→unshift→write→201)
- `server/routes/history.test.js` — 3 t.todo() stubs replaced with real assertions; yaml require added; TEST_ENTRY fixture defined

## Decisions Made

- node:test mock call argument access pattern is `calls[N].arguments[I]`, not `calls[N][I]` — the plan's code example used Sinon/Jest-style indexing which silently returns undefined. Fixed inline without deviating from the plan's intent.
- `percent_complete` coercion kept inline (no helper function) — single use site, matches plan instruction
- No workstreams shape validation on server — trusts client to send correct structure (plan explicit)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed node:test mock call argument access pattern**
- **Found during:** Task 2 (first test run — Test 2 failed with `TypeError: Cannot read properties of undefined (reading '0')`)
- **Issue:** Plan's code example used Sinon/Jest-style `mockWriteYamlFile.mock.calls[0][1]` but node:test mock API exposes `calls[0].arguments[1]`. The index access `calls[0][1]` returns `undefined` because `calls[0]` is a call object (not an array), causing `undefined[0]` error on the YAML parse line.
- **Fix:** Changed `mockWriteYamlFile.mock.calls[0][1]` to `mockWriteYamlFile.mock.calls[0].arguments[1]`
- **Files modified:** `server/routes/history.test.js`
- **Commit:** `17aa26f`

## Issues Encountered

None beyond the auto-fixed mock API pattern.

## User Setup Required

None.

## Next Phase Readiness

- `server/routes/history.js` is fully implemented and tested — ready for 04-05 (Weekly Update Form) to consume
- Full suite at 36 pass / 0 fail / 0 todo
- UPD-04 requirement proven at server layer before form is built

---
*Phase: 04-structured-write-views*
*Completed: 2026-03-05*

## Self-Check: PASSED

- FOUND: server/routes/history.js
- FOUND: server/routes/history.test.js
- FOUND: .planning/phases/04-structured-write-views/04-03-SUMMARY.md
- FOUND: commit f4b2eef (Task 1 - feat)
- FOUND: commit 17aa26f (Task 2 - test)
- Tests: 36 pass, 0 fail, 0 todo (full suite)
