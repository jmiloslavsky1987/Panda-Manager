---
phase: 06-ux-polish-and-feature-enhancements
plan: "05"
subsystem: api

tags: [express, node-test, supertest, yaml, risks, milestones]

# Dependency graph
requires:
  - phase: 06-01
    provides: existing risks.js and milestones.js route files with GET and PATCH handlers

provides:
  - POST /api/customers/:id/risks — creates risk with sequential R-### ID assignment
  - POST /api/customers/:id/milestones — creates milestone with sequential M-### ID assignment
  - 8 passing POST test cases (4 risks + 4 milestones) with real assertions

affects:
  - 06-06 (CustomerOverview inline-add row will call these endpoints)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "read-modify-write atomic POST pattern: readYamlFile → parseYaml → validateYaml → assignNextId → push → normalizeForSerialization → serializeYaml → writeYamlFile → 201"
    - "Required field guard before Drive read: fast-fail 400 avoids unnecessary API call on bad body"

key-files:
  created: []
  modified:
    - server/routes/risks.js
    - server/routes/milestones.js
    - server/routes/risks.test.js
    - server/routes/milestones.test.js

key-decisions:
  - "POST risks and milestones follow exact same pattern as actions.js POST — no deviation from established pattern"
  - "description/name required field validation runs before readYamlFile — fast-fail avoids unnecessary Drive API call"
  - "Milestone POST uses date field name (not target_date) — new records created by POST have their own shape; PATCH is used for existing records with target_date"

patterns-established:
  - "All POST routes: validate required fields first, then read-modify-write, return 201 with created entity"

requirements-completed:
  - UX-08

# Metrics
duration: 5min
completed: 2026-03-06
---

# Phase 06 Plan 05: POST Risks and Milestones Endpoints Summary

**Express POST handlers for risks and milestones with sequential R-### / M-### ID assignment via assignNextId, validated by 8 supertest assertions covering 201 creation, ID sequencing, 400 validation, and atomic write behavior**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-06T02:40:00Z
- **Completed:** 2026-03-06T02:44:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added POST /api/customers/:id/risks with R-### sequential ID assignment, required field validation (description), and read-modify-write atomic write
- Added POST /api/customers/:id/milestones with M-### sequential ID assignment, required field validation (name), and read-modify-write atomic write
- Filled 8 POST test stubs (4 per route) with real supertest assertions; full server suite at 64/64 pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement POST /risks and POST /milestones endpoints** - `b3f9bc5` (feat)
2. **Task 2: Fill POST test assertions in risks.test.js and milestones.test.js** - `70cdc80` (test)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `server/routes/risks.js` - Added POST handler before PATCH; validates description, calls assignNextId('R', data.risks), returns 201 with new risk
- `server/routes/milestones.js` - Added POST handler before PATCH; validates name, calls assignNextId('M', data.milestones), returns 201 with new milestone
- `server/routes/risks.test.js` - Replaced 4 no-callback stubs with real assertions for 201/R-###/400/atomic write
- `server/routes/milestones.test.js` - Replaced 4 no-callback stubs with real assertions for 201/M-###/400/atomic write

## Decisions Made

- POST routes follow the exact same read-modify-write pattern as actions.js — no deviation from established server pattern
- Required field validation (description for risks, name for milestones) runs before readYamlFile to avoid unnecessary Drive API calls on bad input
- Milestone POST stores `date` field (not `target_date`) — the new entity shape is distinct from existing fixture records; existing PATCH handler operates on target_date for pre-existing records

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing supertest devDependency**
- **Found during:** Task 1 verification (running tests)
- **Issue:** supertest listed in package.json devDependencies but not installed in node_modules; tests failed with MODULE_NOT_FOUND
- **Fix:** Ran `npm install --cache /tmp/npm-cache` in server/ to populate node_modules (needed alternate cache due to npm cache ownership issue)
- **Files modified:** server/node_modules (runtime only, not committed)
- **Verification:** All 17 tests pass after install
- **Committed in:** Not committed (node_modules excluded by .gitignore)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Unblocked test execution; no scope creep.

## Issues Encountered

- npm cache was root-owned (prior sudo npm issue); worked around with `--cache /tmp/npm-cache` flag. Tests ran correctly after install.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- POST /risks and POST /milestones are ready for consumption by Plan 06-06 (CustomerOverview inline add-row)
- No blockers; full server test suite green at 64/64

---
*Phase: 06-ux-polish-and-feature-enhancements*
*Completed: 2026-03-06*
